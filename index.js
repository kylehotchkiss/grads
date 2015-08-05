var hapi = require('hapi');
var server = new hapi.Server();
var conditions = require("./library/conditions.js");

server.connection({
    host: '0.0.0.0',
    port: ( process.env.PORT || 5000 )
});

server.route({
    method: 'GET',
    path: '/conditions/{lat}/{lon}/{alt}/{model?}',
    handler: function( req, res ) {
        var target = new conditions( req.params.lat, req.params.lon, ( req.params.alt || 0 ), ( req.params.model || "gfs" ) );

        target.temp(function( temp ) {
            target.wind(function( speed, heading ) {
                res({
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
                        actual: {

                        },
                        grads: {

                        },
                    }
                });
            });
        });
    }
});

server.start();
