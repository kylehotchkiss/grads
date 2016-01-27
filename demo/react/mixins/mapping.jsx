/* global L:true */

var chroma = require('chroma-js');

module.exports = {
    clearMap() {
        try {
            if ( this.state.pointsSource && this.state.pointsLayers.length )
            this.props.map.batch(batch => {
                this.props.map.removeSource( this.state.pointsSource );

                for ( var i in this.state.pointsLayers ) {
                    this.props.map.removeLayer( this.state.pointsLayers[i] );
                }
            });
        } catch ( error ) {}
    },

    drawMap() {
        this.clearMap();
        
        var points = this.state.views[ this.state.step ].points;
        var country = this.state.views[ this.state.step ].country;

        // Move to other file
        var geojson = {
            type: 'FeatureCollection',
            features: []
        }

        for ( var i in points ) {
            var feature = points[i];
            var lat = feature.geometry.coordinates[1];
            var lon = feature.geometry.coordinates[0];
            var res = this.state.gradsConfig.resolution / 2;

            geojson.features.push({
                type: 'Feature',
                properties: feature.properties.values,
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [ lon + res, lat + res ],
                        [ lon + res, lat - res ],
                        [ lon - res, lat - res ],
                        [ lon - res, lat + res ],
                        [ lon + res, lat + res ]
                    ]]
                }
            });
        }

        this.props.map.addSource('grid-' + this.state.step, { type: 'geojson', data: geojson });

        // Variable Specific
        var min = 223.15;
        var max = 311.15;
        var range = max - min;
        var step = range / 20;
        // End variable Specific

        var layers = [];
        var color = chroma.scale( [ '#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac','#053061' ].reverse() ).domain([ 0, 20 ]);

        this.props.map.batch(batch => {
            for ( var i = 0; i < 20; i++ ) {
                var start = min + ( step * ( i + 1 ) );
                var layer = 'layer-' + i + '-' + this.state.step;

                batch.addLayer({
                    id: layer,
                    layout: {},
                    type: 'fill',
                    source: 'grid-' + this.state.step,
                    filter: [ "all", [ ">=", "temperature", start ], [ "<", "temperature", ( start + step ) ] ],
                    paint: {
                        'fill-opacity': .65,
                        'fill-antialias': false,
                        'fill-color': color( i ).hex()
                    }
                });

                layers.push( layer );
            }
        });

        this.setState({
            pointsLayers: layers,
            pointsSource: 'grid-' + this.state.step
        }, () => {
            if ( !this.state.animationID ) {
                this.props.map.fitBounds([[ country.lonMin, country.latMin ], [ country.lonMax, country.latMax ]], { padding: 30 });
            }
        });
    }
}
