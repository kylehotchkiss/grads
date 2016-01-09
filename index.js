//
// index.js
// Loads a quick demo for GrADS stuff
//

'use strict';

var express = require('express');
var app = express();

var grads = require('./library/grads.js');
var sea = require('./library/abstractions/sea.js');
var conditions = require("./library/conditions.js");

app.use( express.static('public') );

app.get('/conditions/:lat/:lon/:alt/:model?', function ( req, res ) {
    try {
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
    } catch ( error ) {
        res.json({ status: 'error', message: error.message });
    }
});

app.get('/sea/:lat/:lon', function ( req, res ) {
    var target = new sea( req.params.lat, req.params.lon );

    console.time("Catching some Waves");
    target.wavesDetail(function( results ) {
        console.timeEnd("Catching some Waves");
        res.json( results );
    });
});

app.get('/ranged/:lat/:lon/:alt/:model?', function ( req, res ) {
    try {
        var target = new grads( req.params.lat, req.params.lon, ( req.params.alt || 0 ), ( req.params.model || "gfs" ) );

        target.fetch( "tmpsfc", false, function( values, key ) {
            res.json({ status: 'success', data: { values: values, key: key }});
        });
    } catch ( error ) {
        res.json({ status: 'error', message: error.message });
    }
});


app.listen(process.env.PORT || 3000, function() {
    console.log('Welcome to grads; check me out http://localhost:3000');
});
