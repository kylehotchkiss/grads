/* global L:true */

var DEGREES = 180 / Math.PI;

module.exports = {
    clearMap() {
        this.props.map.removeLayer( this.state.pointsLayer );
    },

    drawMap() {
        this.clearMap();

        var points = this.state.views[ this.state.step ].points;
        var place = this.state.views[ this.state.step ].place;

        let layer = L.geoJson(points, {
            pointToLayer: feature => {
                // IF TYPE = BLOCK
                // IF TYPE = MARKER

                if ( this.state.metric === 'temperature' ) {
                    var kelvin = parseFloat(feature.properties.values.temperature);
                    var english = ( kelvin - 273.15 ) * 1.8000 + 32.00;

                    return L.rectangle([[
                        feature.geometry.coordinates[1] - (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] - (this.state.gradsConfig.resolution / 2)
                    ], [
                        feature.geometry.coordinates[1] + (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] + (this.state.gradsConfig.resolution / 2)
                    ]], {
                        weight: 0,
                        clickable: false,
                        fillOpacity: 0.5,
                        fillColor: this.color( 'temperature', english )
                    });
                } else if ( this.state.metric === 'pressure' ) {
                    return L.rectangle([[
                        feature.geometry.coordinates[1] - (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] - (this.state.gradsConfig.resolution / 2)
                    ], [
                        feature.geometry.coordinates[1] + (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] + (this.state.gradsConfig.resolution / 2)
                    ]], {
                        weight: 0,
                        clickable: false,
                        fillOpacity: 0.5,
                        fillColor: this.color( 'pressure', parseFloat(feature.properties.values.pressure) )
                    });
                } else if ( this.state.metric === 'clouds' ) {
                    var cover = ( parseFloat( feature.properties.values.clouds ) / 100 ) * .5;

                    return L.rectangle([[
                        feature.geometry.coordinates[1] - (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] - (this.state.gradsConfig.resolution / 2)
                    ], [
                        feature.geometry.coordinates[1] + (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] + (this.state.gradsConfig.resolution / 2)
                    ]], {
                        weight: 0,
                        clickable: false,
                        fillOpacity: cover,
                        fillColor: '#000000'
                    });
                } else if ( this.state.metric === 'snow' ) {
                    var cover = (( parseFloat( feature.properties.values.snow_depth ) * 3.28084 ) / 2) * .5;

                    return L.rectangle([[ // half
                        feature.geometry.coordinates[1] - (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] - (this.state.gradsConfig.resolution / 2)
                    ], [
                        feature.geometry.coordinates[1] + (this.state.gradsConfig.resolution / 2),
                        feature.geometry.coordinates[0] + (this.state.gradsConfig.resolution / 2)
                    ]], {
                        weight: 0,
                        clickable: false,
                        fillOpacity: cover,
                        fillColor: '#0000FF'
                    });
                } else if ( this.state.metric === 'wind' ) {
                    // Create three markers and set their icons to cssIcon
                    var vwind = feature.properties.values.wind_v;
                    var uwind = feature.properties.values.wind_u;

                    var heading = ( 270 - ( Math.atan2( vwind, uwind ) * DEGREES ) ) % 360;
                    var speed = Math.sqrt( Math.pow(Math.abs(vwind), 2) + Math.pow(Math.abs(uwind), 2) );

                    return L.marker([ feature.geometry.coordinates[1], feature.geometry.coordinates[0] ], {
                        icon: L.divIcon({
                            html: '<div class="wind-arrow" style="transform:rotate(' + heading + 'deg);">&rarr;</div>'
                        })
                    });
                }

                return null;
            }
        }).addTo( this.props.map );

        this.setState({
            pointsLayer: layer
        }, () => {
            if ( !this.state.animationID ) {
                this.props.map.fitBounds([[ place.latMin, place.lonMin ], [ place.latMax, place.lonMax ]]);
            }
        });
    }
}
