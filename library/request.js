'use strict';

var redis;
var _ = require('lodash');
var Redis = require('redis');
var Gauge = require('gauge');
var async = require('async');
var moment = require('moment');
var request = require('request');

if ( process.env.REDIS_URL ) {
    redis = Redis.createClient({
        url: process.env.REDIS_URL
    });
}

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

//
// This represents a few but not all the tricks that GrADS would use to build a url
//
exports.build = function( variable, includeAlt ) {
    var level, model, subset, offset, hourset, altitude;

    var timeOffset = ( input ) => {
        return this.remap( moment().diff(input, 'seconds'), [ 0, ( 86400 * this.model.steps.days ) ], [ 0, this.model.steps.time ] );
    };

    // Figure out which dataset to grab, based on time
    // TODO: Why did I use midnight? It works, but why?
    if ( this.model.options.quarterly ) {
        hourset = Math.round( this.remap( this.start.diff( this.midnight, 'hours'), [ 0, 24 ], [ 0, 4 ], true ) * 6 );
    } else {
        hourset = Math.round( this.remap( this.start.diff( this.midnight, 'hours'), [ 0, 24 ], [ 0, 24 ], true ) );
    }

    // In theory, this fixes our crazy offset issues.
    this.start.set('hour', hourset);

    // (Re)validate the incoming dates.
    // Since we could time travel back a report or two
    var difference = moment().diff( this.start, 'hours' );
    var end = moment().add( this.model.steps.time * this.model.steps.interval, 'ms' ).subtract( difference, 'hours' );

    for ( var i in this.time ) {
        if ( this.time[i] < this.start || this.time[i] > end ) {
            throw new Error('Time is out of loaded model bounds (since the latest dataset you requested was unavailable, we time-travlled back to the previous report which exceeded the range of the report)');
        }
    }

    if ( hourset < 10 ) {
        hourset = '0' + hourset;
    }


    // Every model has it's own very random URL format. All are defined in models file.
    var template = _.template( this.model.options.modeltmpl );

    model = template({
        time: this.start,
        hourset: hourset,
        model: this.model
    });

    // Generate parameters portion of the URL, adding level if set
    if ( variable.indexOf('prs') !== -1 ) { // PRS tends to indicate levels of altitude
        if ( this.time.length > 1 ) {
            subset = this.parameters( timeOffset(this.time[0]), this.alt, this.lat, this.lon );
        } else {
            subset = this.parameters( timeOffset(this.time[0]) + ':' + timeOffset(this.time[1]), this.alt, this.lat, this.lon );
        }
    } else {
        if ( this.time.length > 1 ) {
            subset = this.parameters( timeOffset(this.time[0]), this.lat, this.lon );
        } else {
            subset = this.parameters( timeOffset(this.time[0]) + ':' + timeOffset(this.time[1]), this.lat, this.lon );
        }
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
    console.log( this.incrementCounter );
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

    var cached = ( values, config ) => {
        // TODO: merge former config with new one
        callback( values, config );
    };

    if ( redis ) {
        redis.get('grads-request:' + url, function( error, values ) {
            if ( values === false || values === 'false' ) {
                // Time Travel
                self.increment();
                self.fetch( variable, includeAlt, callback );
            } else if ( values ) {
                // Assumes config is always successfully loaded
                redis.get('grads-config:' + url, function( error, config ) {
                    cached( JSON.parse( values ), JSON.parse( config ) );
                });
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

            this.fetch( variable, false, ( values, config ) => {
                i++; callback( false, { values: values, config: config });
            });
        } else {
            console.error( variable + ' is not available in ' + this.model.name );

            callback();
        }
    }, ( error, results ) => {
        if ( !error ) {
            var ensemble = [];
            var config = {};

            for ( var i in results ) {
                _.merge(ensemble, results[i].values);
                _.merge(config, results[i].config);
            }

            gauge.hide();

            this.results = ensemble;

            callback( ensemble, config );
        }
    });
};
