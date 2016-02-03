/* global L:true */

var DEGREES = 180 / Math.PI;
var chroma = require('chroma-js');
var parameters = require('json!../../data/weather-parameters.json');

module.exports = {
    clearMap() {
        this.props.map.removeLayer( this.state.pointsLayer );
    },

    drawMap() {
        let layer;
        let frames = this.state.frames;
        this.clearMap();

        var points = this.state.views[ this.state.step ].points;
        var place = this.state.views[ this.state.step ].place;

        if ( typeof frames[ this.state.step ] === 'undefined' ) {

            var scale;

            // Loop over our existing, not very well organized, GeoJSON
            layer = L.geoJson(points, {
                pointToLayer: feature => {
                    // Check our weather-parameters.json config file for this variable
                    if ( typeof parameters[this.state.metric] !== 'undefined' ) {
                        var parameter = parameters[this.state.metric];
                        var config = { weight: 0, clickable: false };
                        var value = feature.properties.values[this.state.metric];

                        // Loop over all the rules for this variable in weather-parameters.json
                        for ( var rule in parameter.rules ) {
                            var action = parameter.rules[rule];

                            // TODO: Probably not fast
                            if ( action.transform ) {
                                value = eval( action.transform );
                            }

                            if ( rule === 'color' ) {
                                if ( !scale ) {
                                    scale = chroma.scale( action.colors ).domain([ action.min, action.max ]);
                                }

                                config.fillColor = scale( value ).hex();
                            } else if ( rule === 'opacity' ) {
                                var range = action.max - action.min;
                                var normalized = value - action.min;
                                var percentage = normalized / range;
                                config.fillOpacity = percentage * 0.65;
                            }

                            if ( typeof config.fillOpacity === 'undefined' ) {
                                config.fillOpacity = 0.65;
                            }

                            if ( !config.fillColor ) {
                                config.fillColor = "#000000";
                            }

                        }

                        return L.rectangle([[
                            feature.geometry.coordinates[1] - (this.state.gradsConfig.resolution / 2),
                            feature.geometry.coordinates[0] - (this.state.gradsConfig.resolution / 2)
                        ], [
                            feature.geometry.coordinates[1] + (this.state.gradsConfig.resolution / 2),
                            feature.geometry.coordinates[0] + (this.state.gradsConfig.resolution / 2)
                        ]], config);
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
            });

            frames.push( layer );
        } else {
            layer = frames[ this.state.step ];
        }

        layer.addTo( this.props.map );

        this.setState({
            frames: frames,
            pointsLayer: layer
        }, () => {
            if ( !this.state.animationID ) {
                this.props.map.fitBounds([[ place.latMin, place.lonMin ], [ place.latMax, place.lonMax ]]);
            }
        });
    }
}
