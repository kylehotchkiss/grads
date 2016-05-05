'use strict';

var should = require('should');
var Grads = require('../index.js');
var variables = require('./variables.json');

describe('Requesting data from GrADS', function() {
    /////////////////////////////////////////////////////
    // Test input parameters, input parameter mapping, //
    // and proper application of data dimensions       //
    /////////////////////////////////////////////////////
    it('fetches one point for Latitude', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            // Latitude is second (of three) dimension [0][i][0]
            should( Object.keys( values[0] ).length ).equal( 1 );

            done();
        });
    });

    it('fetches one points for Latitude', function( done ) {
        var instance = new Grads( [ variables.locations[0].lat, variables.locations[0].lat2 ], variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            // Latitude is second (of three) dimension [0][i][0]
            should( Object.keys( values[0] ).length ).be.above( 1 );

            done();
        });
    });

    it('fetches one point for Longitude', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            // Longitude is third (of three) dimension [0][0][i]
            should( Object.keys( values[0][0] ).length ).equal( 1 );

            done();
        });
    });

    it('fetches all points for Longitude', function( done ) {
        var instance = new Grads( variables.locations[0].lat, [ variables.locations[0].lon, variables.locations[0].lon2 ], variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            // Longitude is third (of three) dimension [0][0][i]
            should( Object.keys( values[0][0] ).length ).be.above( 1 );

            done();
        });
    });

    it('fetches one point for Altitude', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('vgrdprs', true, function( values, config ) {
            // Altitude is second (of four) dimension [0][i][0][0]
            should( Object.keys( values[0] ).length ).equal( 1 );

            done();
        });
    });

    it('fetches all points for Altitude', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, [ variables.locations[0].alt, variables.locations[0].alt2 ], Date.now(), 'gfs' );

        instance.fetch('vgrdprs', true, function( values, config ) {
            // Altitude is second (of four) dimension [0][i][0][0]
            should( Object.keys( values[0] ).length ).be.above( 1 );

            done();
        });
    });

    it('fetches one point for Time', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            // Time is first (of any) dimension [i][0][0]
            should( Object.keys( values ).length ).equal( 1 );

            done();
        });
    });

    it('fetches all points for Time', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, [ Date.now(), ( Date.now() + 14400000 )], 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            // Time is first (of any) dimension [i][0][0]
            should( Object.keys( values ).length ).equal( 1 );

            done();
        });
    });


    ///////////////////////////////
    // Basic data santity checks //
    ///////////////////////////////
    it('requests temperature for a single location [gfs]', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            should( values[0][0][0].values.temperature ).be.aboveOrEqual(184); // Coldest temperature on earth
            should( values[0][0][0].values.temperature ).be.belowOrEqual(330); // Hottest temperature on earth

            done();
        });
    });

    it('requests temperature for a single location [rap]', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'rap' );

        instance.fetch('temperature', false, function( values, config ) {
            should( values[0][0][0].values.temperature ).be.aboveOrEqual(184); // Coldest temperature on earth
            should( values[0][0][0].values.temperature ).be.belowOrEqual(330); // Hottest temperature on earth

            done();
        });
    });

});

// TODO: further future
// Test config vs input data within range to verify application of ranges
