var async = require('async');
var moment = require('moment');
var request = require('request');

var RADIANS = Math.PI / 180;
var DEGREES = 180 / Math.PI;

var models = {
    noaa: require("../data/noaa-models.json")
};


/**
 *
 * Remap coordinate values into more grads friendly ranges.
 *
 */
var remap = function( value, rangeMin, rangeMax, limitMin, limitMax ) {
    return Math.floor( ((( value - rangeMin ) * ( limitMax - limitMin )) / ( rangeMax - rangeMin )) + limitMin );
};

/**
 *
 * Generate a GRaDS parameter string for request URLs.
 * Pass it any number of string arguments, it'll know what to do.
 *
 */
var parameters = function() {
    var output = "";

    for ( var i in arguments ) {
        var param = arguments[i];

        output += "[" + param + "]";
    }

    return output;
};


function Grads( lat, lon, alt, model ) {
    // Verify that model exists
    if ( typeof models.noaa[model] === "undefined" ) {
        throw new Error( model + " is not a valid weather model.");
    }

    // Load the model configuration
    this.model = models.noaa[ model ];

    // Remap set lat/lon to NOAA grads-friendly values.
    this.lat = remap( lat, this.model.range.latMin, this.model.range.latMax, 0, this.model.steps.lat );
    this.lon = remap( lon, this.model.range.lonMin, this.model.range.lonMax, 0, this.model.steps.lon );
    this.alt = alt;
    this.time = moment();
}

/**
 *
 * Build the GRaDS request URL for the given resource
 *
 */
 Grads.prototype.build = function( variable, includeAlt ) {
    var offset, hourset, altitude, level, subset;

    if ( includeAlt ) {
        if ( this.model.fidelity === "low" ) { // GFS
            if ( this.alt < 1829 ) {
                altitude = "_1829m";
            } else if ( this.alt >= 1829 && this.alt < 2743 ) {
                altitude = "_2743m";
            } else if ( this.alt >= 2743 && this.alt < 3658 ) {
                altitude = "_3658m";
            } if ( this.alt >= 3658 && this.alt < 25908 ) {
                level = Math.round(( this.alt / 25908 ) * this.model.steps.alt);
                altitude = "prs";
            } else if ( this.alt >= 25908 && this.alt < 44307 ) {
                altitude = "30_0mb";
            }
        } else { // RAP and GFSHD
            if ( this.alt < 12000 ) {
                level = Math.round(( this.alt / 12000 ) * this.model.steps.alt);
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
    hourset = Math.floor( remap( this.time.diff(moment().startOf('day'), 'seconds'), 0, 86400, 0, this.model.steps.hours ) * 6 );

    // Figure out which date inside of the dataset to grab
    offset = remap( this.time.diff(moment().startOf('day'), 'seconds'), 0, 86400, 0, this.model.steps.time );

    // Build the model + date portion of the URL
    model = this.model.slug + "/" + this.model.slug + this.time.format("YYYYMMDD") +
        "/" + this.model.slug + "_f" + hourset + ".ascii?";


    // Generate parameters portion of the URL, adding level if set
    if ( level ) {
        subset = parameters( level, offset, this.lat, this.lon );
    } else {
        subset = parameters( offset, this.lat, this.lon );
    }

    // Generate the entire URL, adding altitude if set
    if ( altitude ) {
        return this.model.base + model + variable + altitude + subset;
    } else {
        return this.model.base + model + variable + subset;
    }
};

Grads.prototype.fetch = function() {

};

Grads.prototype.parse = function() {

};


module.exports = Grads;


//var grid = function( offset, lat, lon, alt,  )


/*





        ///////////////////////////////////
        // Get Wind Files (Concurrently) //
        ///////////////////////////////////
        async.parallel({
            u_wind: function( callback ) {
                if ( typeof cache[u_ext] !== "undefined" && cache[u_ext] !== '' ) {
                    //
                    // Pull from gradscache?
                    //
                    callback( null, cache[u_ext] );

                    stats.cacheHits++;
                } else {
                    u_url = baseURL + modelURL + u_ext;

                    log.debug( "HIT: " + modelURL + u_ext );

                    u_req = request(u_url, function ( error, response, body ) {
                        if ( !error ) {
                            callback(null, body);

                            stats.gradsHits++;
                        } else {
                            callback(true, null);
                        }
                    });
                }
            },

            v_wind: function( callback ) {
                if ( typeof cache[v_ext] !== "undefined" && cache[v_ext] !== '' ) {
                    //
                    // Pull from gradscache?
                    //
                    callback( null, cache[u_ext] );

                    stats.cacheHits++;
                } else {
                    v_url = baseURL + modelURL + v_ext;

                    log.debug( "HIT: " + modelURL + v_ext );

                    v_req = request(v_url, function ( error, response, body ) {
                        if ( !error ) {
                            callback(null, body);

                            stats.gradsHits++;
                        } else {
                            callback(true, null);
                        }
                    });
                }
            }
        }, function( error, results ) {
            if ( error ) {
                log.warn("Failed: flight #" + flight.options.flightID + " (grads connectivity failure)");

                parentCallback( error );
            } else {
                /////////////////////////////////////////////////////
                // Transform U & V Components to Wind Vector (m/s) //
                /////////////////////////////////////////////////////

                if ( results.u_wind.indexOf("GrADS Data Server") !== -1 && results.v_wind.indexOf("GrADS Data Server") !== -1 ) {
                    //
                    // This piece catches a little bug called a "GrADS Fail."
                    // What's that? your innocent mind ponders. It's the end,
                    // I answer, wallowing in all my lost predictions.
                    //
                    if ( fnstraj_debug === "true" ) {
                        log.warn("\n\033[1;31mGrADS Fail:\033[0m");

                        var u_errorStart = results.u_wind.indexOf("because of the following error:<p>\n<b>") + 38;
                        var u_errorEnd   = results.u_wind.indexOf("</b><p>\nCheck the syntax of your request,");
                        var v_errorStart = results.u_wind.indexOf("because of the following error:<p>\n<b>") + 38;
                        var v_errorEnd   = results.u_wind.indexOf("</b><p>\nCheck the syntax of your request,");

                        var errorShown = false;

                        if ( u_errorStart !== -1 && u_errorEnd !== -1 ) {
                            var u_error = results.u_wind.substring(u_errorStart, u_errorEnd);
                            log.warn("\033[0;31m" + u_error + "\033[0m\n");
                            errorShown = true;
                        }

                        if ( v_errorStart !== -1 && v_errorEnd !== -1 && errorShown === false ) {
                            var v_error = results.v_wind.substring(v_errorStart, v_errorEnd);
                            log.warn("\033[0;31m" + v_error + "\033[0m\n");
                            errorShown = true;
                        }

                        if ( !errorShown ) {
                            log.warn("\033[0;31mUnknown Error.\033[0m");
                        }
                    } else {
                        log.warn("Failed: flight #" + flight.options.flightID + " (gradsfail)");
                    }

                    parentCallback( true );
                } else {
                    cache[u_ext] = results.u_wind;
                    cache[v_ext] = results.v_wind;
                    u_wind = results.u_wind.substring( results.u_wind.indexOf("[0],") + 5, results.u_wind.indexOf("\n", 30));
                    v_wind = results.v_wind.substring( results.v_wind.indexOf("[0],") + 5, results.v_wind.indexOf("\n", 30));
                    u_wind = u_wind.trim();
                    v_wind = v_wind.trim();

                    if ( u_wind === "9.999E20" || v_wind === "9.999E20" ) {
                        ///////////////////////////////////////////////
                        // CASE: FILL VALUE DETECTED, CANNOT ADVANCE //
                        ///////////////////////////////////////////////
                        log.warn("Failed: flight #" + flight.options.flightID + " (Fill value caught)");
                    }

                    offset  = Math.atan2( v_wind, u_wind ) * degrees; // Is an offset from {below} value.
                    heading = ( 270 + offset ) - 180; // Proper direction - Pretty damned critical.
                    speed   = Math.sqrt( Math.pow(Math.abs(v_wind), 2) + Math.pow(Math.abs(u_wind), 2) );

                    newPoints = position.travel(table[table.length - 2], speed * 60, heading);

                    if ( model === "gfs" || model === "gfshd" ) {
                        ////////////////////////////////////
                        // CASE: CHECK LONGITUDE ACCURACY //
                        ////////////////////////////////////
                        if ( newPoints[1] > 180 ) {
                            newPoints[1] = newPoints[1] - 360;
                        }
                    }

                    table[table.length - 1].latitude = newPoints[0];
                    table[table.length - 1].longitude = newPoints[1];

                    parentCallback();
                }
            }
        });
}
*/
