'use strict';

var moment = require('moment');
var conversions = require('./conversions.js');

//
// Read the GrADS response and decode it
//
exports.parse = function( url, variable, content, callback, timetravel ) {
    var key;
    var lines = content.split('\n');
    var counter = /\[(\d*)\]/g;
    var variables = {};
    var values = {};

    if ( lines[0] === '<html>' ) {
        if ( lines[11].indexOf('Invalid Parameter Exception') ) {
            if ( lines[11].indexOf('is not an available dataset') ) {
                timetravel();
                this.cache( url, false );
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
                    var comma = line.indexOf(',');
                    var indexes = line.substring(0, comma);

                    if ( line.substring( comma + 2 ) === '9.999E20' ) {
                        // console.warn('Fill value detected! Verify accuracy of parameters and URL');
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

                    values = this.mdsave( values, this.matches( indexes, counter ), value );
                }
            }
        }

        if ( !key ) {
            console.log( lines );
            throw new Error('Checking for `time` variable inside of Grads response failed - unable to assign key names');
        }

        // Capture all keys (references) and their array location
        // Can you tell I can't name variables well at this level of iteration yet?
        for ( var j = key; j < lines.length; j++ ) {
            line = lines[j];

            // Verify we're looking at a key and not a value by checking for [%]
            if ( line.indexOf('[') !== -1 && line.indexOf(']') !== -1 ) {
                var refvalues = [];
                var refcomma = line.indexOf(',');
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
                if ( refname === 'time' ) {
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
                        // console.log( 'Difference - ' + moment().diff(moment( refvalues[l] ), 'minutes') + ' minutes');
                    }
                } else if ( refname === 'lon' && this.model.options.degreeseast ) {
                    // Make sure longitudes > 180 become negative values
                    for ( var m in refvalues ) {
                        if ( refvalues[m] > 180 ) {
                            refvalues[m] = -1 * ( 360 - refvalues[m] );
                        }
                    }
                } else if ( refname === 'lev' ) {
                    for ( var n in refvalues ) {
                        refvalues[n] = conversions.altitude( refvalues[n] ).toFixed(2);
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
        // fried from spending a day of my free time working with 'multidimesional'
        // arrays which is pretty much as out of body experience as you can get
        //
        var timeRef, altRef, latRef, lonRef, primed;
        for ( var n in values ) {
            for ( var o in values[n] ) {
                for ( var p in values[n][o] ) {
                    if ( typeof values[n][o][p] === 'object' ) {
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
                                } else if ( r === 'lev' ) {
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
                        primed.values[ variable ] = values[n][o][p];

                        for ( var t in variables ) {
                            if ( t === 'time' ) {
                                primed.time = variables[t][timeRef];
                            } else if ( t === 'lat' ) {
                                primed.lat = variables[t][latRef];
                            } else if ( t === 'lon' ) {
                                primed.lon = variables[t][lonRef];
                            }
                        }

                        values[n][o][p] = primed;
                    }
                }
            }
        }

        // Save processed result into redis
        this.cache( url, values );

        // console.log( 'Requests:' + this.counter );
        callback( values, this.config() );
    }
};

exports.flatten = function() {
    var index;
    var output = {};

    // Y'all ready for this?
    //
    // ░░░░░▄▄▄▄▀▀▀▀▀▀▀▀▄▄▄▄▄▄░░░░░░░
    // ░░░░░█░░░░▒▒▒▒▒▒▒▒▒▒▒▒░░▀▀▄░░░░
    // ░░░░█░░░▒▒▒▒▒▒░░░░░░░░▒▒▒░░█░░░
    // ░░░█░░░░░░▄██▀▄▄░░░░░▄▄▄░░░░█░░
    // ░▄▀▒▄▄▄▒░█▀▀▀▀▄▄█░░░██▄▄█░░░░█░
    // █░▒█▒▄░▀▄▄▄▀░░░░░░░░█░░░▒▒▒▒▒░█
    // █░▒█░█▀▄▄░░░░░█▀░░░░▀▄░░▄▀▀▀▄▒█
    // ░█░▀▄░█▄░█▀▄▄░▀░▀▀░▄▄▀░░░░█░░█░
    // ░░█░░░▀▄▀█▄▄░█▀▀▀▄▄▄▄▀▀█▀██░█░░
    // ░░░█░░░░██░░▀█▄▄▄█▄▄█▄████░█░░░
    // ░░░░█░░░░▀▀▄░█░░░█░█▀██████░█░░
    // ░░░░░▀▄░░░░░▀▀▄▄▄█▄█▄█▄█▄▀░░█░░
    // ░░░░░░░▀▄▄░▒▒▒▒░░░░░░░░░░▒░░░█░
    // ░░░░░░░░░░▀▀▄▄░▒▒▒▒▒▒▒▒▒▒░░░░█░
    // ░░░░░░░░░░░░░░▀▄▄▄▄▄░░░░░░░░█░░
    //
    for ( var i in this.results ) {
        for ( var j in this.results[i] ) {
            for ( var k in this.results[i][j] ) {
                var result;

                if ( typeof this.results[i][j][k].values === 'undefined' && Object.keys( this.results[i][j][k] ).length ) {
                    for ( var l in this.results[i][j][k] ) {
                        result = this.results[i][j][k][l];
                        index = `[${ +moment( result.time ) }][${ result.alt }][${ result.lat }][${ result.lon }]`;

                        output[ index ] = result.values;
                        output[ index ].alt = result.alt;
                        output[ index ].time = result.time;                        
                    }
                } else {
                    result = this.results[i][j][k];
                    index = `[${ +moment( result.time ) }][${ result.lat }][${ result.lon }]`;

                    output[ index ] = result.values;
                    output[ index ].time = result.time;
                }
            }
        }
    }

    return output;
};
