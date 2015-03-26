var hapi = require('hapi');
var server = new hapi.Server();
var conditions = require("./library/conditions.js");

server.connection({
    host: '0.0.0.0',
    port: ( process.env.PORT || 5000 )
});

server.route({
    method: 'GET',
    path: '/conditions/{lat}/{lon}/{alt?}',
    handler: function( req, res ) {
        var target = new conditions( req.params.lat, req.params.lon );

        target.temp(function( temp ) {
            res({
                temp: temp
            });
        });
    }
});

server.start();
