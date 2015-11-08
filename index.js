//
// index.js
// Loads a quick demo for GrADS stuff
//

'use strict';

var express = require('express');

var conditions = require("./library/conditions.js");

var app = express();

app.use( express.static('public') );

app.get('/conditions/:lat/:lon/:alt/:model?', function ( req, res ) {
    var target = new conditions( req.params.lat, req.params.lon, ( req.params.alt || 0 ), ( req.params.model || "gfs" ) );

    target.temp(function( temp ) {
        target.wind(function( speed, heading ) {
            res.json({
                conditions: {
                    temp: temp,
                    windSpeed: speed,
                    windHeading: heading
                },
                meta: {
                    requested: {
                        lat: req.params.lat,
                        lon: req.params.lon,
                        alt: req.params.alt
                    },
                    actual: {},
                    grads: {},
                }
            });
        });
    });
});

app.listen(process.env.PORT || 3000, function() {
    console.log('Welcome to grads; check me out http://localhost:3000');
});
