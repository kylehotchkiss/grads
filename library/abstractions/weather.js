//
// Weather.js
// Logic for typical "weather" based predictions
//
'use strict';

var async = require('async');
var Grads = require('../grads.js');
var conversions = require('../conversions.js');

class Weather extends Grads {
    constructor( lat, lon, alt ) {
        super( lat, lon, alt, 'gfs' );
    }

    visualize( callback ) {
        let self = this;
        var metrics = ["temperature", "clouds", "precipitation_rate", "precipitation_frozen", "snow_depth"];

        self.bulkFetch(metrics, values => {
            callback( values );
        });
    }

    forecast( callback ) {

    }
}

module.exports = Weather;
