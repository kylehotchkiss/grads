/* global jQuery */
/* global L */
'use strict';

jQuery(function() {
    L.mapbox.accessToken = 'pk.eyJ1Ijoia3lsZWhvdGNoa2lzcyIsImEiOiJrTUJ4M0NzIn0.4yBXlPfoO1B2T1rnudXr_w';

    var map_one = L.mapbox.map('demo-one', 'mapbox.satellite');
    var map_two = L.mapbox.map('demo-two', 'mapbox.satellite');

    map_one.on('click', function( event ) {
        var lat = event.latlng.lat;
        var lon = event.latlng.lng;

        jQuery('.js-demo-one-lat').html('<code>' + lat.toFixed(2) + '</code>');
        jQuery('.js-demo-one-lon').html('<code>' + lon.toFixed(2) + '</code>');
        jQuery('.js-demo-one-cond').text('loading...');

        jQuery.ajax({
            dataType: 'json',
            url: '/conditions/' + lat + '/' + lon + '/0',
            success: function( response ) {
                var temp = response.conditions.temp;
                var windSpeed = response.conditions.windSpeed;
                var windHeading = response.conditions.windHeading;

                jQuery('.js-demo-one-temp').html('<code>' + temp.toFixed(2) + '&deg;f</code>');
                jQuery('.js-demo-one-windSpeed').html('<code>' + windSpeed.toFixed(2) + 'mph</code>');
                jQuery('.js-demo-one-windHeading').html('<code>' + windHeading.toFixed(2) + '&deg;</code>');
            }
        });
    });

    map_two.on('click', function( event ) {
        var lat = event.latlng.lat;
        var lon = event.latlng.lng;

        jQuery('.js-demo-two-lat').html('<code>' + lat.toFixed(2) + '</code>');
        jQuery('.js-demo-two-lon').html('<code>' + lon.toFixed(2) + '</code>');
        jQuery('.js-demo-two-cond').text('loading...');

        jQuery.ajax({
            dataType: 'json',
            url: '/sea/' + lat + '/' + lon,
            success: function( response ) {
                var wind = response.wind;
                var primary = response.primary;
                var secondary = response.secondary;

                if ( primary.waveHeight && primary.wavePeriod && primary.waveHeading ) {
                    jQuery('.js-demo-two-primary').html('<code><strong>' + primary.waveHeight.toFixed(1) + '</strong>ft at <strong>' + primary.wavePeriod.toFixed(1) + '</strong>s. ' + primary.waveHeading.toFixed(0) + '&deg</code>');
                } else {
                    jQuery('.js-demo-two-primary').html('Unavailable at this location');
                }

                if ( secondary.waveHeight && secondary.wavePeriod && secondary.waveHeading ) {
                    jQuery('.js-demo-two-secondary').html('<code><strong>' + secondary.waveHeight.toFixed(1) + '</strong>ft at <strong>' + secondary.wavePeriod.toFixed(1) + '</strong>s. ' + secondary.waveHeading.toFixed(0) + '&deg</code>');
                } else {
                    jQuery('.js-demo-two-secondary').html('Unavailable at this location');
                }

                if ( wind.waveHeight && wind.wavePeriod && wind.waveHeading ) {
                    jQuery('.js-demo-two-wind').html('<code><strong>' + wind.waveHeight.toFixed(1) + '</strong>ft at <strong>' + wind.wavePeriod.toFixed(1) + '</strong>s. ' + wind.waveHeading.toFixed(0) + '&deg</code>');
                } else {
                    jQuery('.js-demo-two-wind').html('Unavailable at this location');
                }
            }
        });
    });
});
