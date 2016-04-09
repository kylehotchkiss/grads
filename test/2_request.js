'use strict';

var Grads = require('../index.js');
var variables = require('./variables.json');

describe('Requesting data from GrADS', function() {
    it('requests temperature for a single location [gfs]', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            //console.log( values );

            done();
        });
    });

    it('requests temperature for a single location [rap]', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'rap' );

        instance.fetch('temperature', false, function( values, config ) {
            //console.log( values );

            done();
        });
    });
});

// properly fetches one points for Latitude
// properly fetches all points for Latitude
// properly fetches one points for Longitude
// properly fetches all points for Longitude
// properly fetches one points for Altitude
// properly fetches all points for Altitude
// properly fetches one points for Time
// properly fetches all points for Time
