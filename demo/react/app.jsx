/* global L:true */
/* global document:true */
'use strict';
import React from 'react';
import jQuery from 'jquery';
import ReactDOM from 'react-dom';

import Submittable from 'react-submittable';
import { countries } from 'json!../data/countries.json';

var ForecastController = React.createClass({

    getInitialState() {
        return {
            country: '',
            pointsLayer: {}
        };
    },

    renderCountries() {
        return countries.map(( country, i ) => {
            return (
                <option value={ i } key={ i }>{ country.name }</option>
            );
        });
    },

    clearCountry() {
        this.setState({
            country: ''
        }, () => {
            this.clearMap();
        });
    },

    changeCountry() {
        this.setState({
            country: this.refs.country.value
        }, () => {
            this.requestPoints( this.refs.country.value );
        });
    },

    color( value ) {
        let colors = ['#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac','#053061'].reverse();
        return colors[ Math.floor(( parseInt(value) / 100 ) * 10).toFixed(0) ];
    },

    requestPoints( countryID ) {
        let country = countries[ countryID ];

        if ( typeof country === 'object' ) {
            let lat = country.latMin + ':' + country.latMax;
            let lon = country.lonMin + ':' + country.lonMax;

            jQuery.ajax({ url: `/ranged/${lat}/${lon}/0`, success: response => {
                let points = [];
                let data = response.data;

                if ( response.status === 'success' ) {
                    for ( var i in data.values ) {
                        // The time variable: values[0]

                        for ( var j in data.values[i] ) { // reverse because smaller is lower
                            // The latitude variable: values[0][0]

                            for ( var k in data.values[i][j] ) {
                                // The latitude value: values[0][0][0]
                                // Data layer

                                var kelvin = parseFloat(data.values[i][j][k].value);
                                var english = ( kelvin - 273.15 ) * 1.8000 + 32.00;

                                points.push({
                                    type: 'Feature',
                                    properties: { text: english.toFixed(0) + 'deg', color: this.color( english.toFixed(0) ) },
                                    geometry: { type: 'Point', coordinates: [ data.values[i][j][k].lon, data.values[i][j][k].lat ]}
                                });
                            }
                        }

                        this.drawMap( points, country );
                    }
                } else {
                    console.error( data.message );
                }
            }});
        }
    },

    clearMap() {
        this.props.map.removeLayer( this.state.pointsLayer );
    },

    drawMap( points, country ) {
        this.clearMap();

        let layer = L.geoJson(points, {
            pointToLayer: function( feature ) {
                return L.rectangle([[
                    feature.geometry.coordinates[1] - 0.5,
                    feature.geometry.coordinates[0] - 0.5
                ], [
                    feature.geometry.coordinates[1] + 0.5,
                    feature.geometry.coordinates[0] + 0.5
                ]], {
                    weight: 0,
                    clickable: false,
                    fillOpacity: 0.1,
                    fillColor: feature.properties.color
                });
            }
        }).addTo( this.props.map );

        this.setState({
            pointsLayer: layer
        }, () => {
            this.props.map.fitBounds([[ country.latMin, country.lonMin ], [ country.latMax, country.lonMax ]]);
        });
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-6">
                    <h3>Choose a country </h3>

                    <Submittable onEnter={ this.changeCountry } onCancel={ this.clearCountry }>
                        <select ref="country" onChange={ this.changeCountry } defaultValue={ this.state.country }>
                            <option value="">Select a country...</option>
                            { this.renderCountries() }
                        </select>
                    </Submittable>
                </div>

                <div className="col-sm-6">
                    <h3>Choose a time</h3>

                    <p>Coming Soon</p>
                </div>
            </div>
        );
    }
});

jQuery(() => {
    L.mapbox.accessToken = 'pk.eyJ1Ijoia3lsZWhvdGNoa2lzcyIsImEiOiJrTUJ4M0NzIn0.4yBXlPfoO1B2T1rnudXr_w';
    let map = L.mapbox.map('js-map-container', 'mapbox.light');

    ReactDOM.render( <ForecastController map={ map } />, document.getElementById('react-forecast-controller') );
});
