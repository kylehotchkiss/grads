'use strict';

var redis;
var Redis = require('redis');
var moment = require('moment');

if ( true ) {
    redis = Redis.createClient();
}

//
// Remap coordinate values into more grads friendly ranges.
// http://rosettacode.org/wiki/Map_range#JavaScript
//
exports.remap = function( value, from, to, strict ) {
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
exports.mdsave = function( values, indexes, value ) {
    var cmd = 'values';

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
            eval( cmd + ' = ' + value );
        } else if ( eval( 'typeof ' + cmd ) === 'undefined' ) {
            eval( cmd + ' = {}' );
        }
    }

    return values;
};


//
// Get Regex matches for a given string and regex.
//
exports.matches = function( string, regex, index ) {
    var match;
    var matches = [];
    var i = index || 1;

    while ( match = regex.exec( string ) ) {
        matches.push( match[ i ] );
    }

    return matches;
};


//
// Store value in Redis cache, if Redis exists. Set expiration.
//
exports.cache = function( prefix, url, values ) {
    if ( redis ) {
        redis.set( 'grads-' + prefix + ':' + url, JSON.stringify(values) );
        redis.expire( 'grads-' + prefix + ':' + url , 1800 );
    }
};


//
// Returns auto-configuration values for the current request
// (eg return resolution value so map knows how big blocks should be)
//
// TODO: Switch to resolutionX, resolutionY, resolutionZ
exports.config = function() {
    var resolution = this.reducer ? this.model.options.resolution * this.reducer : this.model.options.resolution;
    var resolution_x = this.reducer ? this.model.options.resolution_x * this.reducer : this.model.options.resolution_x;
    var resolution_y = this.reducer ? this.model.options.resolution_y * this.reducer : this.model.options.resolution_y;

    return {
        keys: this.keys, // keys for doing nearest-neighbor lookups
        offset: this.offset, // backwards iterations to reach dataset (eg 1)
        resolution: resolution,
        resolution_x: resolution_x,
        resolution_y: resolution_y // deg
    };
};

//
// Generate a GrADS parameter string for request URLs.
// Pass it any number of string arguments, it'll know what to do.
//
exports.parameters = function() {
    var output = '';

    for ( var i in arguments ) {
        var param = arguments[i];

        if ( Array.isArray( param ) ) {
            if ( param.length === 1 ) {
                output += '[' + param[0] + ']';
            } else {
                if ( this.reducer ) {
                    output += '[' + param[0] + ':' + this.reducer + ':' + param[1] + ']';
                } else {
                    output += '[' + param[0] + ':' + param[1] + ']';
                }
            }
        } else {
            output += '[' + param + ']';
        }
    }

    return output;
};


//
// 'Time Traveling'
// New dataset release schedules are ambigious at best, so move backwards if
// the desired dataset is currently unavailable.
//
exports.increment = function( hours ) {
    this.incrementCounter++;
    this.offset = this.offset + ( hours || 1 );
    this.time = moment().utc().subtract(this.offset, 'hours');
    this.midnight = moment().utc().subtract(this.offset, 'hours').startOf('day');

    if ( this.incrementCounter > 25 ) {
        throw new Error('GrADS overflow error');
    }
};



//
// Incorrect altitude selection code
//
/*
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
*/
