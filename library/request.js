'use strict';

var redis;
var _ = require('lodash');
var Redis = require('redis');
var Gauge = require('gauge');
var async = require('async');
var moment = require('moment');
var request = require('request');

if ( true ) {
    redis = Redis.createClient();
}

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;


//
// This represents a few but not all the tricks that GrADS would use to build a url
//
exports.build = function( variable, includeAlt ) {
    var level, model, subset, offset, hourset, altitude;

    if ( includeAlt ) {
        if ( this.model.options.fidelity === 'low' ) { // GFS
            if ( this.alt[0] < 1829 ) {
                altitude = '_1829m';
            } else if ( this.alt[0] >= 1829 && this.alt[0] < 2743 ) {
                altitude = '_2743m';
            } else if ( this.alt[0] >= 2743 && this.alt[0] < 3658 ) {
                altitude = '_3658m';
            } if ( this.alt[0] >= 3658 && this.alt[0] < 25908 ) {
                level = this.remap( this.alt[0], [ 3658, 25908 ], [ 0, this.model.steps.alt ], true );
                altitude = 'prs';
            } else if ( this.alt[0] >= 25908 && this.alt[0] < 44307 ) {
                altitude = '30_0mb';
            }
        } else { // RAP and GFSHD
            if ( this.alt[0] < 12000 ) {
                level = this.remap( this.alt[0], [ 0, 12000 ], [ 0, this.model.steps.alt ], true );
                altitude = 'prs';
            } else if ( this.alt[0] >= 12000 && this.alt[0] < 14000 ) {
                altitude = '180_150mb';
            } else if ( this.alt[0] >= 14000 && this.alt[0] < 15000 ) {
                altitude = '150_120mb';
            } else if ( this.alt[0] >= 15000 && this.alt[0] < 17000 ) {
                altitude = '120_90mb';
            } else if ( this.alt[0] >= 17000 && this.alt[0] < 19000 ) {
                altitude = '90_60mb';
            } else if ( this.alt[0] >= 19000 && this.alt[0] < 24000 ) {
                altitude = '60_30mb';
            } else if ( this.alt[0] >= 24000 ) {
                altitude = '30_0mb';
            }
        }
    }

    // Figure out which dataset to grab, based on time
    if ( this.model.options.quarterly ) {
        hourset = Math.round( this.remap( this.time.diff( this.midnight, 'hours'), [ 0, 24 ], [ 0, 4 ], true ) * 6 );
    } else {
        hourset = Math.round( this.remap( this.time.diff( this.midnight, 'hours'), [ 0, 24 ], [ 0, 24 ], true ) );
    }

    // In theory, this fixes our crazy offset issues.
    this.time.set('hour', hourset);

    if ( hourset < 10 ) {
        hourset = '0' + hourset;
    }

    // Figure out which date inside of the dataset to grab
    offset = this.remap( moment().diff(this.time, 'seconds'), [ 0, ( 86400 * this.model.steps.days ) ], [ 0, this.model.steps.time ] );

    // Build the model + date portion of the URL
    //if ( this.model.slug === 'wave' ) { // TODO: Allow for passing arbirary naming formats via config
        // model = this.model.slug + '/' + this.model.name + '/' + this.time.format('YYYYMMDD') + '/multi_1.glo_30mext' + this.time.format('YYYYMMDD') + '_' + hourset + 'z.ascii?';
    //} else {
        // model = this.model.slug + '/' + this.model.name + this.time.format('YYYYMMDD') + '/' + this.model.slug + '_' + hourset + 'z.ascii?';
    //}

    // Every model has it's own very random URL format. All are defined in models file.
    var template = _.template( this.model.options.modeltmpl );

    model = template({
        time: this.time,
        hourset: hourset,
        model: this.model
    });

    // Generate parameters portion of the URL, adding level if set
    if ( typeof level === 'number' ) {
        subset = this.parameters( offset, level, this.lat, this.lon );
    } else {
        //subset = parameters( offset, this.lat, this.lon );
        subset = this.parameters( offset + ':' + ( offset + 16 ), this.lat, this.lon );
    }

    // Generate the entire URL, adding altitude if set
    if ( altitude ) {
       return this.model.base + model + ( this.dictionary[ variable ] || variable ) + altitude + subset;
    } else {
       return this.model.base + model + ( this.dictionary[ variable ] || variable ) + subset;
    }
};


//
// Build the GrADS request URL for the given resource
//
exports.fetch = function( variable, includeAlt, parentCallback ) {
    var self = this;
    var url = this.build( variable, includeAlt );

    var callback = ( values, config ) => {
        this.results = values;

        parentCallback( values, config );
    };

    // Debug:
    //console.log( this.incrementCounter );
    //console.log( url );

    var online = () => {
        request( url, function( error, response, body ) {
            self.counter++;

            if ( !error ) {
                self.parse( url, variable, body, callback, function() {
                     // Time Travel
                     self.increment();
                     self.fetch( variable, includeAlt, callback );
                });
            }
        });
    };

    var cached = values => {
        callback( values, this.config() );
    };

    if ( redis ) {
        redis.get('request:' + url, function( error, values ) {
            if ( values ) {
                cached( JSON.parse( values ) );
            } else if ( values === false ) {
                // Time Travel
                self.increment();
                self.fetch( variable, includeAlt, callback );
            } else {
                online();
            }
        });
    } else {
        online();
    }
};


//
// Bulk fetch: grab multiple variables in parallel
// Merge datasets together
//
exports.bulkFetch = function( variables, callback ) {
     var i = 0;
     var total = variables.length;
     var gauge = new Gauge();

     async.mapSeries( variables, ( variable, callback ) => {
         if ( typeof this.dictionary[ variable ] !== 'undefined' ) {
             var name = this.model.name + ' ↦ ' + this.dictionary[ variable ];
             gauge.show( name , ( i / total ) );

             this.fetch( variable, false, values => {
                 i++; callback( false, values );
             });
         } else {
             //console.error( variable + ' is not available in ' + this.model.name );

             callback();
         }
    }, ( error, results ) => {
        if ( !error ) {
            var ensemble = [];

            for ( var i in results ) {
                _.merge(ensemble, results[i]);
            }

            gauge.hide();

            this.results = ensemble;

            callback( ensemble, this.config() );
        }
    });
};
