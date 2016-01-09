//
// grads.js
// This file is the primary interface with NOAA's GrADS dataset.
//

'use strict';

var moment = require('moment');
var request = require('request');
var models = { noaa: require("../data/noaa-models.json") };


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
//
var mdsave = function( values, indexes, value ) {
    var cmd = "values";

    for ( var i in indexes ) {
        var index = indexes[i];

        cmd += '[' + index + ']';

        if ( parseInt( i ) === ( indexes.length - 1 ) ) {
            eval( cmd + " = " + value );
        } else if ( eval( "typeof " + cmd ) === "undefined" ) {
            eval( cmd + " = {}" );
        }
    }

    return values;
};


//
// Generate a GrADS parameter string for request URLs.
// Pass it any number of string arguments, it'll know what to do.
//
var parameters = function() {
    var output = "";

    for ( var i in arguments ) {
        var param = arguments[i];

        output += "[" + param + "]";
    }

    return output;
};


//
// Get Regex matches for a given string and regex.
//
//
var matches = function( string, regex, index ) {
    var i = index || 1;
    var match;
    var matches = [];

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
            model = "rap";
        }

        // Load the model configuration
        this.lat = [];
        this.lon = [];
        this.offset = 0;
        this.counter = 0;
        this.incrementCounter = 0;
        this.model = models.noaa[ model ];
        this.time = moment().utc().subtract(this.offset, 'hours');
        this.midnight = moment().utc().subtract(this.offset, 'hours').startOf('day');

        // Read in ranges for Latitude, Longitude, and Altitude
        // Verify ranges are small:large
        // TODO: Can make this more robust in future by flipping them for user
        if ( lat.indexOf(':') !== -1 ) {
            lat = lat.split(':');

            if ( parseFloat(lat[0]) > parseFloat(lat[1]) ) {
                throw new Error('Smaller Latitude must occur first in range');
            }
        } else {
            lat = [ lat ];
        }

        if ( lon.indexOf(':') !== -1 ) {
            lon = lon.split(':');

            if ( parseFloat(lon[0]) > parseFloat(lon[1]) ) {
                throw new Error('Smaller Longitude must occur first in range');
            }
        } else {
            lon = [ lon ];
        }

        if ( alt.indexOf(':') !== -1 ) {
            alt = alt.split(':');

            if ( parseFloat(alt[0]) > parseFloat(alt[1]) ) {
                throw new Error('Smaller Altitude must occur first in range');
            }
        } else {
            alt = [ alt ];
        }

        // If we're using a degreeseast model, convert the longitude to 0-360deg
        if ( this.model.options.degreeseast ) {
            for ( var i in lon ) {
                if ( lon[i] < 0 ) {
                    lon[i] = ( 360 - (lon[i] * -1) );
                }
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

            this.lon.push( remap( lon, [ this.model.range.lonMin, this.model.range.lonMax ], [ 0, this.model.steps.lon ], true ) );
        }

        this.alt = alt;
    }


    increment( hours ) {
        this.incrementCounter++;
        this.offset = this.offset + ( hours || 1 );
        this.time = moment().utc().subtract(this.offset, 'hours');
        this.midnight = moment().utc().subtract(this.offset, 'hours').startOf('day');

        // console.log( 'Time Travel Iteration: ' + this.incrementCounter );
    }


    build( variable, includeAlt ) {
        var level, model, subset, offset, hourset, altitude;

        if ( includeAlt ) {
            if ( this.model.options.fidelity === "low" ) { // GFS
                if ( this.alt < 1829 ) {
                    altitude = "_1829m";
                } else if ( this.alt >= 1829 && this.alt < 2743 ) {
                    altitude = "_2743m";
                } else if ( this.alt >= 2743 && this.alt < 3658 ) {
                    altitude = "_3658m";
                } if ( this.alt >= 3658 && this.alt < 25908 ) {
                    level = remap( this.alt, [ 3658, 25908 ], [ 0, this.model.steps.alt ], true );
                    altitude = "prs";
                } else if ( this.alt >= 25908 && this.alt < 44307 ) {
                    altitude = "30_0mb";
                }
            } else { // RAP and GFSHD
                if ( this.alt < 12000 ) {
                    level = remap( this.alt, [ 0, 12000 ], [ 0, this.model.steps.alt ], true );
                    altitude = "prs";
                } else if ( this.alt >= 12000 && this.alt < 14000 ) {
                    altitude = "180_150mb";
                } else if ( this.alt >= 14000 && this.alt < 15000 ) {
                    altitude = "150_120mb";
                } else if ( this.alt >= 15000 && this.alt < 17000 ) {
                    altitude = "120_90mb";
                } else if ( this.alt >= 17000 && this.alt < 19000 ) {
                    altitude = "90_60mb";
                } else if ( this.alt >= 19000 && this.alt < 24000 ) {
                    altitude = "60_30mb";
                } else if ( this.alt >= 24000 ) {
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
        if ( this.model.slug === 'wave' ) { // TODO: Allow for passing arbirary naming formats via config
            model = this.model.slug + "/" + this.model.name + '/' + this.time.format("YYYYMMDD") +
                "/multi_1.glo_30mext" + this.time.format("YYYYMMDD") + "_" + hourset + "z.ascii?";
        } else {
            model = this.model.slug + "/" + this.model.name + this.time.format("YYYYMMDD") +
                "/" + this.model.slug + "_" + hourset + "z.ascii?";
        }

        // Generate parameters portion of the URL, adding level if set
        if ( typeof level === "number" ) {
            subset = parameters( offset, level, this.lat, this.lon );
        } else {
            subset = parameters( offset, this.lat, this.lon );
        }

        // Generate the entire URL, adding altitude if set
        if ( altitude ) {
           return this.model.base + model + variable + altitude + subset;
        } else {
           return this.model.base + model + variable + subset;
        }
    }


    /*
     *
     * Read the GrADS response and decode it
     *
     */
    parse( content, callback, timetravel ) {
        var key, line, comma, value, indexes;
        var lines = content.split("\n");
        var counter = /\[(\d)\]/g;
        var variables = {};
        var values = {};

        if ( lines[0] === "<html>" ) {
            if ( lines[11].indexOf('Invalid Parameter Exception') ) {
                // Figure out why we're time travelling, if we want.
                // console.log( lines[11] );
            }

            timetravel();
        } else {
            // Capture all values and their array location
            for ( var i = 1; i < lines.length; i++ ) {
                line = lines[i];

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
                    comma = line.indexOf(",");
                    indexes = line.substring(0, comma);

                    if ( line.substring( comma + 2 ) === "9.999E20" ) {
                        // console.warn("Fill value detected! Verify accuracy of parameters and URL");
                        value = null;
                    } else {
                        value = parseFloat(line.substring( comma + 2 ));
                    }

                    values = mdsave( values, matches( indexes, counter ), value );
                }
            }

            if ( !key ) {
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
                    var variable = line.substring(0, refcomma);

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
                    if ( variable === "time" ) {
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
                    } else if ( variable === 'lon' && this.model.options.degreeseast ) {
                        // Make sure longitudes > 180 become negative values
                        for ( var n in refvalues ) {
                            if ( refvalues[n] > 180 ) {
                                refvalues[n] = -1 * ( 360 - refvalues[n] );
                            }
                        }
                    }

                    variables[ variable ] = refvalues;

                    // Skip the value line
                    j++;
                }
            }

            // console.log( 'Requests:' + this.counter );
            callback( values, variables );
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
       //console.log( url );

       request( url, function( error, response, body ) {
           self.counter++;

           if ( !error ) {
               self.parse( body, callback, function() {
                    // Time Travel
                    self.increment();
                    self.fetch( variable, includeAlt, callback );
               });

               // Wut to do?
           }
       });

       // TODO:
       // - Cache responses via Redis for 1 hour
   }
}

module.exports = Grads;
