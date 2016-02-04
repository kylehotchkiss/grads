//
// grads.js
// This file is the primary interface with NOAA's GrADS dataset.
//

'use strict';

var _ = require('lodash');
var Redis = require("redis");
var async = require('async');
var moment = require('moment');
var request = require('request');
var Dictionary = require('../data/variable-mapping.json');
var models = { noaa: require('../data/noaa-models.json') };

var redis;

if ( true ) {
    redis = Redis.createClient();
}

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;


//
// Remap coordinate values into more grads friendly ranges.
// http://rosettacode.org/wiki/Map_range#JavaScript
//
var remap = function( value, from, to, strict ) {
    var result = to[0] + ( value - from[0] ) * ( to[1] - to[0] ) / ( from[1] - from[0] );
    if ( strict ) { // Allow better proximity to data when GrADS allows it
        return Math.floor( result );
    } else {
        return Math.round( result );
    }
};


//
// Hacky code to build and add to multidimesional arrays
// This literally builds strings for objects and evals them
// This is likely the largest speed issue in the entire app
//
var mdsave = function( values, indexes, value ) {
    var cmd = "values";

    if ( Array.isArray( value ) ) {
        var temp = {};

        for ( var i in value ) {
            temp[ String(i) ] = value[i];
        }

        value = JSON.stringify(temp);
    }

    for ( var j in indexes ) {
        var index = indexes[j];

        cmd += '[' + index + ']';

        if ( parseInt( j ) === ( indexes.length - 1 ) ) {
            eval( cmd + " = " + value );
        } else if ( eval( "typeof " + cmd ) === "undefined" ) {
            eval( cmd + " = {}" );
        }
    }

    return values;
};


//
// Get Regex matches for a given string and regex.
//
var matches = function( string, regex, index ) {
    var match;
    var matches = [];
    var i = index || 1;

    while ( match = regex.exec( string ) ) {
        matches.push( match[ i ] );
    }

    return matches;
};


class Grads {
    constructor( lat, lon, alt, model ) {
        // Verify that model exists
        if ( typeof models.noaa[model] === "undefined" ) {
            // throw new Error( model + " is not a valid weather model.");
            model = "gfs";
        }

        // Load the model configuration
        this.lat = [];
        this.lon = [];
        this.offset = 0;
        this.reducer = 0;
        this.counter = 0;
        this.resolution = 50; // set via query string
        this.incrementCounter = 0;
        this.model = models.noaa[ model ];
        this.dictionary = Dictionary[ model || 'gfs' ];
        this.time = moment().utc().subtract(this.offset, 'hours');
        this.midnight = moment().utc().subtract(this.offset, 'hours').startOf('day');

        // Read in ranges for Latitude, Longitude, and Altitude
        // Verify ranges are small:large
        // TODO: Can make this more robust in future by flipping them for user
        if ( lat.indexOf(':') !== -1 ) {
            lat = lat.split(':');
            lat[0] = parseFloat(lat[0]);
            lat[1] = parseFloat(lat[1]);
            var diffLat = ( lat[1] - lat[0] ) / this.model.options.resolution;

            if ( diffLat > this.resolution ) {
                this.reducer = Math.ceil(diffLat / this.resolution);
            }

            if ( lat[0] > lat[1] ) {
                throw new Error('Smaller Latitude must occur first in range');
            }
        } else {
            lat = [ lat ];
        }

        if ( lon.indexOf(':') !== -1 ) {
            lon = lon.split(':');
            lon[0] = parseFloat(lon[0]);
            lon[1] = parseFloat(lon[1]);
            var diffLon = (lon[1] - lon[0]) / this.model.options.resolution;

            if ( diffLon > this.resolution ) {
                var reducer = Math.ceil( diffLon / this.resolution );

                if ( reducer > this.reducer ) {
                    this.reducer = reducer
                }
            }

            if ( lon[0] > lon[1] ) {
                throw new Error('Smaller Longitude must occur first in range');
            }
        } else {
            lon = [ lon ];
        }

        if ( alt.indexOf(':') !== -1 ) {
            //alt = alt.split(':');

            //if ( parseFloat(alt[0]) > parseFloat(alt[1]) ) {
            //    throw new Error('Smaller Altitude must occur first in range');
            //}

            throw new Error('Altitude sets are not currently supported due to Grads complexities');
        } else {
            alt = [ alt ];
        }

        // If we're using a degreeseast model, convert the longitude to 0-360deg
        if ( this.model.options.degreeseast ) {
            for ( var i in lon ) {
                if ( lon[i] < 0 ) {
                    lon[i] = ( 360 - ( parseFloat(lon[i]) * -1 ) );
                }
            }

            // Reverse Parameter order if needed
            if ( lon[0] > lon[1] ) {
                var immediate = lon[0];
                lon[0] = lon[1]
                lon[1] = immediate;
            }
        }


        // Validate Boundaries and set grads-friendly coordinate sets
        for ( var j in lat ) {
            if ( lat[j] < this.model.range.latMin || lat[j] > this.model.range.latMax ) {
                throw new Error('Latitude is out of model bounds');
            }

            this.lat.push( remap( lat[j], [ this.model.range.latMin, this.model.range.latMax ] , [ 0, this.model.steps.lat ], true ) );
        }

        for ( var k in lon ) {
            if ( lon[k] < this.model.range.lonMin || lon[k] > this.model.range.lonMax ) {
                throw new Error('Longitude is out of model bounds');
            }

            this.lon.push( remap( lon[k], [ this.model.range.lonMin, this.model.range.lonMax ], [ 0, this.model.steps.lon ], true ) );
        }

        this.alt = alt;
    }


    //
    // Returns auto-configuration values for the current request
    // (eg return resolution value so map knows how big blocks should be)
    //
    config() {
        var resolution = this.reducer ? this.model.options.resolution * this.reducer : this.model.options.resolution;
        var resolution_x = this.reducer ? this.model.options.resolution_x * this.reducer : this.model.options.resolution_x;
        var resolution_y = this.reducer ? this.model.options.resolution_y * this.reducer : this.model.options.resolution_y;

        return {
            offset: this.offset, // backwards iterations to reach dataset (eg 1)
            resolution: resolution,
            resolution_x: resolution_x,
            resolution_y: resolution_y // deg
        }
    }


    //
    // Generate a GrADS parameter string for request URLs.
    // Pass it any number of string arguments, it'll know what to do.
    //
    parameters() {
        var output = "";

        for ( var i in arguments ) {
            var param = arguments[i];

            if ( Array.isArray( param ) ) {
                if ( param.length === 1 ) {
                    output += "[" + param[0] + "]";
                } else {
                    if ( this.reducer ) {
                        output += "[" + param[0] + ':' + this.reducer + ':' + param[1] + "]";
                    } else {
                        output += "[" + param[0] + ':' + param[1] + "]";
                    }
                }
            } else {
                output += "[" + param + "]";
            }
        }

        return output;
    }


    //
    // "Time Traveling"
    // New dataset release schedules are ambigious at best, so move backwards if
    // the desired dataset is currently unavailable.
    //
    increment( hours ) {
        this.incrementCounter++;
        this.offset = this.offset + ( hours || 1 );
        this.time = moment().utc().subtract(this.offset, 'hours');
        this.midnight = moment().utc().subtract(this.offset, 'hours').startOf('day');

        if ( this.incrementCounter > 25 ) {
            throw new Error('GrADS overflow error');
        }
    }


    build( variable, includeAlt ) {
        var level, model, subset, offset, hourset, altitude;

        if ( includeAlt ) {
            if ( this.model.options.fidelity === "low" ) { // GFS
                if ( this.alt[0] < 1829 ) {
                    altitude = "_1829m";
                } else if ( this.alt[0] >= 1829 && this.alt[0] < 2743 ) {
                    altitude = "_2743m";
                } else if ( this.alt[0] >= 2743 && this.alt[0] < 3658 ) {
                    altitude = "_3658m";
                } if ( this.alt[0] >= 3658 && this.alt[0] < 25908 ) {
                    level = remap( this.alt[0], [ 3658, 25908 ], [ 0, this.model.steps.alt ], true );
                    altitude = "prs";
                } else if ( this.alt[0] >= 25908 && this.alt[0] < 44307 ) {
                    altitude = "30_0mb";
                }
            } else { // RAP and GFSHD
                if ( this.alt[0] < 12000 ) {
                    level = remap( this.alt[0], [ 0, 12000 ], [ 0, this.model.steps.alt ], true );
                    altitude = "prs";
                } else if ( this.alt[0] >= 12000 && this.alt[0] < 14000 ) {
                    altitude = "180_150mb";
                } else if ( this.alt[0] >= 14000 && this.alt[0] < 15000 ) {
                    altitude = "150_120mb";
                } else if ( this.alt[0] >= 15000 && this.alt[0] < 17000 ) {
                    altitude = "120_90mb";
                } else if ( this.alt[0] >= 17000 && this.alt[0] < 19000 ) {
                    altitude = "90_60mb";
                } else if ( this.alt[0] >= 19000 && this.alt[0] < 24000 ) {
                    altitude = "60_30mb";
                } else if ( this.alt[0] >= 24000 ) {
                    altitude = "30_0mb";
                }
            }
        }

        // Figure out which dataset to grab, based on time
        if ( this.model.options.quarterly ) {
            hourset = Math.round( remap( this.time.diff( this.midnight, 'hours'), [ 0, 24 ], [ 0, 4 ], true ) * 6 );
        } else {
            hourset = Math.round( remap( this.time.diff( this.midnight, 'hours'), [ 0, 24 ], [ 0, 24 ], true ) );
        }

        // In theory, this fixes our crazy offset issues.
        this.time.set('hour', hourset);

        if ( hourset < 10 ) {
            hourset = "0" + hourset;
        }

        // Figure out which date inside of the dataset to grab
        offset = remap( moment().diff(this.time, 'seconds'), [ 0, ( 86400 * this.model.steps.days ) ], [ 0, this.model.steps.time ] );

        // Build the model + date portion of the URL
        //if ( this.model.slug === 'wave' ) { // TODO: Allow for passing arbirary naming formats via config
            // model = this.model.slug + "/" + this.model.name + '/' + this.time.format("YYYYMMDD") + "/multi_1.glo_30mext" + this.time.format("YYYYMMDD") + "_" + hourset + "z.ascii?";
        //} else {
            // model = this.model.slug + "/" + this.model.name + this.time.format("YYYYMMDD") + "/" + this.model.slug + "_" + hourset + "z.ascii?";
        //}

        // Every model has it's own very random URL format. All are defined in models file.
        var template = _.template( this.model.options.modeltmpl );

        model = template({
            time: this.time,
            hourset: hourset,
            model: this.model
        });

        // Generate parameters portion of the URL, adding level if set
        if ( typeof level === "number" ) {
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
    }


    /*
     *
     * Read the GrADS response and decode it
     *
     */
    parse( url, variable, content, callback, timetravel ) {
        var key;
        var lines = content.split("\n");
        var counter = /\[(\d*)\]/g;
        var variables = {};
        var values = {};

        if ( lines[0] === "<html>" ) {
            if ( lines[11].indexOf('Invalid Parameter Exception') ) {
                if ( lines[11].indexOf('is not an available dataset') ) {
                    timetravel();
                } else {
                    console.error( lines[11] );
                    throw new Error( 'GrADS parameter error' );
                }
            }
        } else {
            // Capture all values and their array location
            for ( var i = 1; i < lines.length; i++ ) {
                var line = lines[i];

                // Stop looping when we hit the 3 blanks spaces
                // that GrADS uses to seperate values from key

                // When the data is not 3D, blank lines mean we can parse variables
                // But when we switch over to 3D data, we need to check for the `time`
                // variable which appears consistant throughout requests
                // if ( line === '' ) {
                if ( line.indexOf('time,') !== -1 ) {
                    key = i;

                    break;
                } else {
                    if ( line !== '' ) {
                        var value = [];
                        var comma = line.indexOf(",");
                        var indexes = line.substring(0, comma);

                        if ( line.substring( comma + 2 ) === "9.999E20" ) {
                            // console.warn("Fill value detected! Verify accuracy of parameters and URL");
                            value = [ null ];
                        } else {
                            if ( line.substring( comma + 2 ).indexOf(',') !== -1 ) {
                                let entries = line.substring( comma + 2 ).split(',');

                                for ( var j in entries ) {
                                    value.push( parseFloat( entries[j] ));
                                }
                            } else {
                                value.push( parseFloat( line.substring( comma + 2 ) ) );
                            }
                        }

                        values = mdsave( values, matches( indexes, counter ), value );
                    }
                }
            }

            if ( !key ) {
                console.log( lines )
                throw new Error('Checking for `time` variable inside of Grads response failed - unable to assign key names');
            }

            // Capture all keys (references) and their array location
            // Can you tell I can't name variables well at this level of iteration yet?
            for ( var j = key; j < lines.length; j++ ) {
                line = lines[j];

                // Verify we're looking at a key and not a value by checking for [%]
                if ( line.indexOf("[") !== -1 && line.indexOf("]") !== -1 ) {
                    var refvalues = [];
                    var refcomma = line.indexOf(",");
                    var refname = line.substring(0, refcomma);

                    if ( lines[ j + 1 ].indexOf(',') !== -1 ) {
                        // Data is 3D
                        var entries = lines[ j + 1 ].split(',');

                        for ( var k in entries ) {
                            refvalues.push( parseFloat( entries[k] ) );
                        }
                    } else {
                        refvalues.push( parseFloat( lines[ j + 1 ] ) );
                    }

                    // Lightly process variables
                    if ( refname === "time" ) {
                        // GrADS time is days since 1-1-1
                        // Set days since to Unix Epoch

                        for ( var l in refvalues ) {
                            var days = refvalues[l] - 719164;
                            var seconds = ( days % 1 ) * 86400;
                            var time = moment.utc( 0 )
                                .add( days, 'days' )
                                .add( seconds, 'seconds' );

                            refvalues[l] = time.toJSON();

                            // Debug:
                            // console.log( moment( refvalues[l] ).format() );
                            // console.log( "Difference - " + moment().diff(moment( refvalues[l] ), 'minutes') + " minutes");
                        }
                    } else if ( refname === 'lon' && this.model.options.degreeseast ) {
                        // Make sure longitudes > 180 become negative values
                        for ( var m in refvalues ) {
                            if ( refvalues[m] > 180 ) {
                                refvalues[m] = -1 * ( 360 - refvalues[m] );
                            }
                        }
                    }

                    variables[ refname ] = refvalues;

                    // Skip the value line
                    j++;
                }
            }

            //
            // Apply variables to values so we can associate data with reality
            // This is so stupid complicated and harded coded but my mind is
            // fried from spending a day of my free time working with "multidimesional"
            // arrays which is pretty much as out of body experience as you can get
            //
            var timeRef, altRef, latRef, lonRef, primed;
            for ( var n in values ) {
                for ( var o in values[n] ) {
                    for ( var p in values[n][o] ) {
                        if ( typeof p === 'object' ) {
                            for ( var q in values[n][o][p] ) {
                                timeRef = n;
                                altRef = o;
                                latRef = p;
                                lonRef = q;
                                primed = { values: {} };
                                primed.values[ variable ] = values[n][o][p][q];

                                for ( var r in variables ) {
                                    if ( r === 'time' ) {
                                        primed.time = variables[r][timeRef];
                                    } else if ( r === 'alt' ) {
                                        primed.alt = variables[r][altRef];
                                    } else if ( r === 'lat' ) {
                                        primed.lat = variables[r][latRef];
                                    } else if ( r === 'lon' ) {
                                        primed.lon = variables[r][lonRef];
                                    }
                                }

                                values[n][o][p][q] = primed;
                            }
                        } else {
                            timeRef = n;
                            latRef = o;
                            lonRef = p;
                            primed = { values: {} };
                            primed.values[ variable ] = values[n][o][p]

                            for ( var r in variables ) {
                                if ( r === 'time' ) {
                                    primed.time = variables[r][timeRef];
                                } else if ( r === 'alt' ) {
                                    primed.alt = variables[r][altRef];
                                } else if ( r === 'lat' ) {
                                    primed.lat = variables[r][latRef];
                                } else if ( r === 'lon' ) {
                                    primed.lon = variables[r][lonRef];
                                }
                            }

                            values[n][o][p] = primed;
                        }
                    }
                }
            }

            // Save processed result into redis
            if ( redis ) {
                redis.set( 'request:' + url, JSON.stringify(values) );
            }

            // console.log( 'Requests:' + this.counter );
            callback( values, this.config() );
        }
   }

   /**
    *
    * Build the GrADS request URL for the given resource
    *
    */
   fetch( variable, includeAlt, callback ) {
       var self = this;
       var url = this.build( variable, includeAlt );

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
       }

       var cached = values => {
           callback( values, this.config() );
       }

       if ( redis ) {
           redis.get('request:' + url, function( error, values ) {
               if ( values ) {
                   cached( JSON.parse( values ) );
               } else {
                   online();
               }
           });
       } else {
           online();
       }
   }

   /**
    *
    * Bulk fetch: grab multiple variables in parallel
    * Merge datasets together
    *
    */
    bulkFetch( variables, callback ) {
        async.mapSeries( variables, ( variable, callback ) => {
            console.time(variable);

            if ( typeof this.dictionary[ variable ] !== 'undefined' ) {
                this.fetch( variable, false, values => {
                    console.timeEnd(variable);
                    callback( false, values );
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

                callback( ensemble, this.config() );
            }
        });
    }
}

module.exports = Grads;
