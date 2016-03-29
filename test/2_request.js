'use strict';

var Grads = require('../index.js');
var variables = require('./variables.json');

describe('Requesting data from GrADS', function() {
    it('requests temperature for a single location [gfs]', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, 'gfs' );

        instance.fetch('temperature', false, function( values, config ) {
            //console.log( values );

            done();
        });
    });

    it('requests temperature for a single location [rap]', function( done ) {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, 'rap' );

        instance.fetch('temperature', false, function( values, config ) {
            //console.log( values );

            done();
        });
    });
});
