'use strict';

var Grads = require('../index.js');
var variables = require('./variables.json');

describe('Creating grads objects / input validation', function() {
    it('creates a grads object [gfs]', function() {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'gfs' );
    });

    it('creates a grads object [rap]', function() {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'rap' );
    });

    it('creates a grads object [hrrr]', function() {
        var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'rap' );
    });

    it('creates a grads object in a weird location [gfs]', function() {
        var instance = new Grads( variables.locations[1].lat, variables.locations[1].lon, variables.locations[1].alt, Date.now(), 'gfs' );
    });

    it('fails when creating rap object in weird location [rap]', function() {
        try {
            var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'rap' );
        } catch( error ) {
            error.should.be.truthy;
        }
    });

    it('fails when creating hrrr object in weird location [hrrr]', function() {
        try {
            var instance = new Grads( variables.locations[0].lat, variables.locations[0].lon, variables.locations[0].alt, Date.now(), 'rap' );
        } catch( error ) {
            error.should.be.truthy;
        }
    });

    it('properly validates latitude ranges when crossing a range [rap]', function() {
        try {
            var instance = new Grads( variables.latitudeEdge, variables.locations[1].lon, variables.locations[1].alt, Date.now(), 'rap' );
            var instance2 = new Grads( [ variables.latitudeEdge - 1, variables.latitudeEdge + 1 ], variables.locations[1].lon, variables.locations[1].alt, Date.now(), 'rap' );
        } catch( error ) {
            error.should.be.truthy;
        }
    });

    it('properly validates longitude ranges when crossing a range [rap]', function() {
        try {
            var instance = new Grads( variables.locations[1].lat, variables.longitudeEdge, variables.locations[1].alt, Date.now(), 'rap' );
            var instance2 = new Grads( variables.locations[1].lat, [ variables.longitudeEdge - 1, variables.longitudeEdge + 1 ], variables.locations[1].alt, Date.now(), 'rap' );
        } catch( error ) {
            error.should.be.truthy;
        }
    });

    it('flips large:small latitude range input [gfs]', function() {
        var instance = new Grads( variables.locations[3].lat, variables.locations[2].lon, variables.locations[1].alt, Date.now(), 'gfs' );
    });

    it('flips large:small longitude range input [gfs]', function() {
        var instance = new Grads( variables.locations[2].lat, variables.locations[3].lon, variables.locations[1].alt, Date.now(), 'gfs' );
    });
});

// fails when init GFS too late
// fails when init GFS too soon
// properly validates times when crossing a range [rap]
