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
    }
};
