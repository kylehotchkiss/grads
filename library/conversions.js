'use strict';

module.exports = {
    mstomph: function( ms ) {
        return ms * 2.23694;
    },

    mtof: function( m ) {
        return m * 3.28084;
    },

    ktof: function( k ) {
        return (( k - 273.15) * 1.8000) + 32.00;
    },

    pressure: function( altitude ) {
        return Math.pow( ( Math.pow( 1035.6, 0.190284 ) - ( 0.000084288 * altitude ) ), 5.2553026 ) + 0.3;
    },

    altitude: function( pressure ) { // http://www.srh.noaa.gov/images/epz/wxcalc/pressureAltitude.pdf
        return (( 1 - Math.pow( ( pressure / 1013.25 ), 0.190284 ) ) * 145366.45) * 0.3048;
    }
};
