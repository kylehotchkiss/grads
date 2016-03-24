'use strict';

var Grads = require('../index.js');
var variables = require('./variables.json');

describe('Creating grads objects / input validation', function() {
    it('creates a grads object [gfs]', function() {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, 'gfs' );
    });

    it('creates a grads object [rap]', function() {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, 'rap' );
    });

    it('creates a grads object [hrrr]', function() {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, 'rap' );
    });

    it('creates a grads object in a weird location [gfs]', function() {
        var instance = new Grads( variables.locations[1].lat, variables.locations[1].lon, variables.locations[1].alt, 'gfs' );
    });

    it('fails when creating rap object in weird location [rap]', function() {
        try {
            var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, 'rap' );
        } catch( error ) {
            error.should.be.truthy;
        }
    });

    it('fails when creating hrrr object in weird location [hrrr]', function() {
        try {
            var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, 'rap' );
        } catch( error ) {
            error.should.be.truthy;
        }
    });
});

// fails when init GFS too late
// fails when init GFS too soon
// properly validates latitude ranges when crossing a range [rap]
// properly validates longitude ranges when crossing a range [rap]
// properly validates times when crossing a range [rap]
// flips large:small latitude range input [rap]
// flips large:small longitude range input [rap]
