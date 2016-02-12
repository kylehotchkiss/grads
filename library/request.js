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

    // Every model has it's own very random URL format. All are defined in models file.
    var template = _.template( this.model.options.modeltmpl );

    model = template({
        time: this.time,
        hourset: hourset,
        model: this.model
    });

    // Generate parameters portion of the URL, adding level if set
    //if ( typeof level === 'number' ) {
    if ( variable.indexOf('prs') ) { // PRS tends to indicate levels of altitude
        subset = this.parameters( offset + ':' + ( offset + 3 ), this.alt, this.lat, this.lon );
    } else {
        //subset = parameters( offset, this.lat, this.lon );
        subset = this.parameters( offset + ':' + ( offset + 16 ), this.lat, this.lon );
    }

    // Generate the entire URL, adding altitude if set
    //if ( altitude ) {
    //   return this.model.base + model + ( this.dictionary[ variable ] || variable ) + altitude + subset;
    //} else {
       return this.model.base + model + ( this.dictionary[ variable ] || variable ) + subset;
    //}
};


//
// Build the GrADS request URL for the given resource
//
exports.fetch = function( variable, includeAlt, parentCallback ) {
    var self = this;
    var url = this.build( variable, includeAlt );

    if ( typeof variable === 'object' ) {
        throw new Error('Use grads.bulkFetch for sets of variables (such as wind data)');
    }

    var callback = ( values, config ) => {
        this.results = values;

        parentCallback( values, config );
    };

    // Debug:
    //console.log( this.incrementCounter );
    console.log( url );

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
            // TODO: Why does redis cast false differently sometimes?

            if ( values === false || values === 'false' ) {
                // Time Travel
                self.increment();
                self.fetch( variable, includeAlt, callback );
            } else if ( values ) {
                cached( JSON.parse( values ) );
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
    var slice = [];
    var total = variables.length;
    var gauge = new Gauge();

    // We have limited support for requesting sets of data so when we're using
    // grads-queryable, we don't need to figure out all the wind variables for the model
    for ( var j in variables ) {
        var definition = this.dictionary[ variables[ j ] ];

        if ( Array.isArray( definition ) )  {
            for ( var k in definition ) {
                variables.push( definition[ k ] );
            }

            slice.push( variables[j] );
        }
    }

    // Remove the original key names for the variable sets
    for ( var l in slice ) {
        variables.splice( variables.indexOf( slice[l] ), 1 );
    }

    async.mapSeries( variables, ( variable, callback ) => {
        if ( typeof this.dictionary[ variable ] !== 'undefined' ) {
            var name = this.model.name + ' ↦ ' + this.dictionary[ variable ];
            gauge.show( name , ( i / total ) );

            this.fetch( variable, false, values => {
                i++; callback( false, values );
            });
        } else {
            console.error( variable + ' is not available in ' + this.model.name );

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
