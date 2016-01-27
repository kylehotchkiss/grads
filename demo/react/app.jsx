/* global document:true */

'use strict';
import React from 'react';
import jQuery from 'jquery';
import ReactDOM from 'react-dom';
import { countries } from 'json!../data/countries.json';

var ForecastController = React.createClass({
    getInitialState() {
        return {
            step: 0,
            country: '',
            loaded: false,
            metric: 'temperature',
            animationID: false,

            views: [],
            timeline: [],
            gradsConfig: {},
            pointsLayer: {},
        };
    },

    mixins: [
        require('./mixins/mapping.jsx'),
        require('./mixins/controls.jsx'),
        require('./mixins/animations.jsx')
    ],

    color( variable, value ) {
        let redblue = ['#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac','#053061'].reverse();

        if ( variable === 'temperature' ) {
            return redblue[ Math.floor(( parseInt(value) / 100 ) * 10).toFixed(0) ];
        } else if ( variable === 'pressure' ) { // Pascals
            return redblue[ Math.floor(( parseInt(value) - 87000  ) / 21500 * 10).toFixed(0)  ];
        }
    },


    //////////////////
    // INPUT EVENTS //
    //////////////////
    clearCountry() {
        this.setState({
            step: 0,
            country: ''
        }, () => {
            this.clearMap();
        });
    },

    changeCountry() {
        this.endAnimation();

        this.setState({
            step: 0,
            country: this.refs.country.value
        }, () => {
            this.requestPoints( this.refs.country.value );
        });
    },

    changeStep( event ) {
        this.endAnimation();

        this.setState({
            step: event.target.value
        }, () => {
            this.drawMap();
        });
    },

    changeMetric( metric ) {
        this.setState({
            metric: metric
        }, () => {
            this.drawMap();
        })
    },

    requestPoints( countryID ) {
        let country = countries[ countryID ];

        if ( typeof country === 'object' ) {
            let lat = country.latMin + ':' + country.latMax;
            let lon = country.lonMin + ':' + country.lonMax;

            this.setState({ loaded: false });

            jQuery.ajax({ url: `/weather/visualize/${lat}/${lon}/0`, success: response => {
                let views = [];
                let timeline = [];
                let data = response.data;

                if ( response.status === 'success' ) {
                    for ( var i in data.values ) { // The time variable: values[0]
                        let points = [];

                        for ( var j in data.values[i] ) { // The latitude variable: values[0][0]
                            for ( var k in data.values[i][j] ) { // The latitude value: values[0][0][0]

                                points.push({
                                    type: 'Feature',
                                    properties: { values: data.values[i][j][k].values },
                                    geometry: { type: 'Point', coordinates: [ data.values[i][j][k].lon, data.values[i][j][k].lat ] }
                                });
                            }
                        }

                        views.push({ points: points, country: country });
                        timeline.push( data.values[i][0][0].time );
                    }

                    this.setState({
                        loaded: true,
                        views: views,
                        timeline: timeline,
                        gradsConfig: data.config,
                    }, () => {
                        this.drawMap();
                    });
                } else {
                    console.error( data.message );
                }
            }});
        }
    }
});

jQuery(() => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoia3lsZWhvdGNoa2lzcyIsImEiOiJrTUJ4M0NzIn0.4yBXlPfoO1B2T1rnudXr_w';

    var map = new mapboxgl.Map({
        zoom: 3,
        container: 'js-map-container',
        center: [ -98.583333, 39.833333 ],
        style: 'mapbox://styles/mapbox/light-v8'
    });

    map.on('style.load', () => {
        ReactDOM.render(
            <ForecastController map={ map } />,
            document.getElementById('react-forecast-controller')
        );
    });
});
