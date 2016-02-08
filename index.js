//
// grads.js
// This file is the primary interface with NOAA's GrADS dataset.
//

'use strict';

var redis;
var Redis = require('redis');
var moment = require('moment');
var request = require('request');
var Dictionary = require('./data/variable-mapping.json');
var models = { noaa: require('./data/noaa-models.json') };

var post = require('./library/post.js');
var request = require('./library/request.js');
var utilities = require('./library/utilities.js');

if ( true ) {
    redis = Redis.createClient();
}

var Grads = function( lat, lon, alt, model ) {
    // Verify that model exists
    if ( typeof models.noaa[model] === 'undefined' ) {
        // throw new Error( model + ' is not a valid weather model.');
        model = 'gfs';
    }


    // Load functions
    this.remap = utilities.remap;
    this.cache = utilities.cache;
    this.mdsave = utilities.mdsave;
    this.config = utilities.config;
    this.matches = utilities.matches;
    this.increment = utilities.increment;
    this.parameters = utilities.parameters;
    this.build = request.build;
    this.fetch = request.fetch;
    this.bulkFetch = request.bulkFetch;
    this.parse = post.parse;
    this.flatten = post.flatten;


    // Load the model configuration
    this.alt = [];
    this.lat = [];
    this.lon = [];
    this.offset = 0;
    this.reducer = 0;
    this.counter = 0;
    this.results = {};
    this.resolution = 50; // set via query string
    this.incrementCounter = 0; // Class wide iteration offset to prevent garbage requests
    this.model = models.noaa[ model ]; // Load (known) NOAA model configuration
    this.dictionary = Dictionary[ model || 'gfs' ]; // Load a common set of variable names for accessing weather
    this.time = moment().utc().subtract(this.offset, 'hours');
    this.midnight = moment().utc().subtract(this.offset, 'hours').startOf('day');

    // Read in ranges for Latitude, Longitude, and Altitude
    // Verify ranges are small:large
    // TODO: Can make this more robust in future by flipping them for user
    if ( typeof lat === 'string' && lat.indexOf(':') !== -1 ) {
        lat = lat.split(':');
        lat[0] = parseFloat(lat[0]);
        lat[1] = parseFloat(lat[1]);
        var diffLat = ( lat[1] - lat[0] ) / this.model.options.resolution;

        if ( diffLat > this.resolution ) {
            this.reducer = Math.ceil(diffLat / this.resolution);
        }

        if ( isNaN( lat[0] ) || isNaN( lat[1] ) ) {
            throw new Error('Invalid Latitude value was set');
        }

        if ( lat[0] > lat[1] ) {
            throw new Error('Smaller Latitude must occur first in range');
        }
    } else {
        lat = [ lat ];
    }

    if ( typeof lon === 'string' && lon.indexOf(':') !== -1 ) {
        lon = lon.split(':');
        lon[0] = parseFloat(lon[0]);
        lon[1] = parseFloat(lon[1]);
        var diffLon = (lon[1] - lon[0]) / this.model.options.resolution;

        if ( diffLon > this.resolution ) {
            var reducer = Math.ceil( diffLon / this.resolution );

            if ( reducer > this.reducer ) {
                this.reducer = reducer;
            }
        }

        if ( isNaN( lon[0] ) || isNaN( lon[1] ) ) {
            throw new Error('Invalid Longitude value was set');
        }

        if ( lon[0] > lon[1] ) {
            throw new Error('Smaller Longitude must occur first in range');
        }
    } else {
        lon = [ lon ];
    }

    if ( typeof alt === 'string' && alt.indexOf(':') !== -1 ) {
        //alt = alt.split(':');

        //if ( parseFloat(alt[0]) > parseFloat(alt[1]) ) {
        //    throw new Error('Smaller Altitude must occur first in range');
        //}

        //if ( lon[0] > lon[1] ) {
        //    throw new Error('Smaller Longitude must occur first in range');
        //}

        throw new Error('Altitude sets are not currently supported due to Grads complexities');
    } else {
        alt = [ alt ];
    }

    // If we're using a degreeseast model, convert the longitude to 0-360deg
    if ( this.model.options.degreeseast ) {
        for ( var i in lon ) {
            if ( lon[i] < 0 ) {
                lon[i] = ( 360 - ( parseFloat(lon[i]) * -1 ) );
            }
        }

        // Reverse Parameter order if needed
        if ( lon[0] > lon[1] ) {
            var immediate = lon[0];
            lon[0] = lon[1];
            lon[1] = immediate;
        }
    }


    // Validate Boundaries and set grads-friendly coordinate sets
    for ( var j in lat ) {
        if ( lat[j] < this.model.range.latMin || lat[j] > this.model.range.latMax ) {
            throw new Error('Latitude is out of model bounds');
        }

        this.lat.push( this.remap( lat[j], [ this.model.range.latMin, this.model.range.latMax ] , [ 0, this.model.steps.lat ], true ) );
    }

    for ( var k in lon ) {
        if ( lon[k] < this.model.range.lonMin || lon[k] > this.model.range.lonMax ) {
            throw new Error('Longitude is out of model bounds');
        }

        this.lon.push( this.remap( lon[k], [ this.model.range.lonMin, this.model.range.lonMax ], [ 0, this.model.steps.lon ], true ) );
    }

    this.alt = alt;
};

module.exports = Grads;
