//
// Sea.js
// Logic for liquid-surface based predictions
//
'use strict';

var async = require('async');
var Grads = require('../grads.js');
var conversions = require('../conversions.js');

class Sea extends Grads {
    constructor( lat, lon, alt ) {
        super( lat, lon, alt, 'wave' );
    }

    wavesSummary( callback ) {
        let self = this;
        let operations = [ 'htsgwsfc', 'perpwsfc', 'dirpwsfc' ];

        async.map(operations, function( item, callback ) {
            self.fetch( item, false, function( result ) {
                callback( false, result[0][0] );
            });
        }, function( error, results ) {
            if ( error ) {
                console.error( error );
            } else {
                callback({
                    waveHeight: conversions.mtof(results[0]),
                    wavePeriod: results[1],
                    waveHeading: results[2]
                });
            }
        });
    }

    wavesDetail( callback ) {
        let self = this;
        let operations = [ 'swell_1', 'swper_1', 'swdir_1', 'swell_2', 'swper_2', 'swdir_2', 'wvhgtsfc', 'wvpersfc', 'wvdirsfc', 'windsfc', 'wvdirsfc' ];

        async.map(operations, function( item, callback ) {
            self.fetch( item, false, function( result ) {
                callback( false, result[0][0] );
            });
        }, function( error, results ) {
            if ( error ) {
                console.error( error );
            } else {
                callback({
                    primary: {
                        waveHeight: conversions.mtof(results[0]),
                        wavePeriod: results[1],
                        waveHeading: results[2]
                    },
                    secondary: {
                        waveHeight: conversions.mtof(results[3]),
                        wavePeriod: results[4],
                        waveHeading: results[5]
                    },
                    wind: {
                        waveHeight: conversions.mtof(results[6]),
                        wavePeriod: results[7],
                        waveHeading: results[8],
                        windSpeed: conversions.mstomph(results[9]),
                        windHeading: results[10]
                    }
                });
            }
        });
    }
}

module.exports = Sea;
