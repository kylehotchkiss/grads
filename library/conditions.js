/* jshint esnext:true */
'use strict';
var Grads = require('./grads.js');

var RADIANS = Math.PI / 180;
var DEGREES = 180 / Math.PI;

var ktof = function( k ) {
    return (( k - 273.15) * 1.8000) + 32.00;
};

var mstomph = function( ms ) {
    return ms * 2.23694;
};

class Conditions extends Grads {
    constructor( lat, lon, alt, model ) {
        super( lat, lon, alt, model );
    }

    wind( callback ) {
        var self = this;

        self.fetch( "vgrd", true, function( vcomp, variables ) {
            self.fetch( "ugrd", true, function( ucomp ) {
                var uwind, vwind;

                if ( typeof vcomp[0][0] === "object" && vcomp[0][0] ) {
                    vwind = vcomp[0][0][0];
                } else {
                    vwind = vcomp[0][0];
                }

                if ( typeof ucomp[0][0] === "object" && ucomp[0][0] ) {
                    uwind = ucomp[0][0][0];
                } else {
                    uwind = ucomp[0][0];
                }

                var heading = ( 270 - ( Math.atan2( vwind, uwind ) * DEGREES ) ) % 360;
                var speed = Math.sqrt( Math.pow(Math.abs(vwind), 2) + Math.pow(Math.abs(uwind), 2) );

                callback( mstomph(speed), heading );
            });
        });
    }

    temp( callback ) {
        var self = this;

        self.fetch( "tmpsfc", false, function( variable ) {
            callback( ktof( variable[0][0] ) );
        });
    }
}

module.exports = Conditions;
