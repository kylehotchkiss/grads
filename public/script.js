jQuery(function() {
    L.mapbox.accessToken = 'pk.eyJ1Ijoia3lsZWhvdGNoa2lzcyIsImEiOiJrTUJ4M0NzIn0.4yBXlPfoO1B2T1rnudXr_w';

    var map = L.mapbox.map('map', 'mapbox.satellite');

    map.on('click', function( event ) {
        var lat = event.latlng.lat;
        var lon = event.latlng.lng;

        jQuery('.js-lat').html('<code>' + lat.toFixed(2) + '</code>');
        jQuery('.js-lon').html('<code>' + lon.toFixed(2) + '</code>');
        jQuery('.js-cond').text('loading...');

        jQuery.ajax({
            dataType: 'json',
            url: '/conditions/' + lat + '/' + lon + '/0',
            success: function( response ) {
                var temp = response.conditions.temp;
                var windSpeed = response.conditions.windSpeed;
                var windHeading = response.conditions.windHeading;

                jQuery('.js-temp').html('<code>' + temp.toFixed(2) + '&deg;f</code>');
                jQuery('.js-windSpeed').html('<code>' + windSpeed.toFixed(2) + 'mph</code>');
                jQuery('.js-windHeading').html('<code>' + windHeading.toFixed(2) + '&deg;</code>');
            }
        });
    });
});
