//
// index.js
// Loads a quick demo for GrADS stuff
//

'use strict';

var express = require('express');
var app = express();

var Sea = require('./library/abstractions/sea.js');
var Weather = require('./library/abstractions/weather.js');
var Conditions = require('./library/abstractions/_conditions.js');

app.use( express.static('public') );

app.get('/sea/:lat/:lon', function ( req, res ) {
    var target = new Sea( req.params.lat, req.params.lon );

    console.time('Catching some Waves');
    target.wavesDetail(function( results ) {
        console.timeEnd('Catching some Waves');
        res.json( results );
    });
});

app.get('/weather/visualize/:lat/:lon/:alt/:model?', function ( req, res ) {
    try {
        var target = new Weather( req.params.lat, req.params.lon, ( req.params.alt || 0 ), req.params.model );

        target.visualize(( values, config ) => {
            target.flatten( values );

            res.json({ status: 'success', data: { values: values, config: config }});
        });
    } catch ( error ) {
        console.error( error.stack );
        res.json({ status: 'error', message: error.message });
    }
});


app.listen(process.env.PORT || 3000, function() {
    console.log('Welcome to grads; check me out http://localhost:3000');
});
