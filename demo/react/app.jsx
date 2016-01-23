/* global L:true */
/* global document:true */
'use strict';
import React from 'react';
import jQuery from 'jquery';
import Moment from 'moment';
import ReactDOM from 'react-dom';
import Loader from 'react-loader';

import Range from 'react-range';
import Submittable from 'react-submittable';
import { countries } from 'json!../data/countries.json';

var ForecastController = React.createClass({
    getInitialState() {
        return {
            step: 0,
            views: [],
            timeline: [],

            country: '',
            loaded: true,
            pointsLayer: {},
            metric: 'clouds',
            animationID: false
        };
    },

    color( value ) {
        let colors = ['#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac','#053061'].reverse();
        return colors[ Math.floor(( parseInt(value) / 100 ) * 10).toFixed(0) ];
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

            jQuery.ajax({ url: `/ranged/${lat}/${lon}/0`, success: response => {
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
                        timeline: timeline
                    }, () => {
                        this.drawMap();
                    });
                } else {
                    console.error( data.message );
                }
            }});
        }
    },


    ////////////////////////
    // MAPPING OPERATIONS //
    ////////////////////////
    clearMap() {
        this.props.map.removeLayer( this.state.pointsLayer );
    },

    drawMap() {
        this.clearMap();

        var points = this.state.views[ this.state.step ].points;
        var country = this.state.views[ this.state.step ].country;

        let layer = L.geoJson(points, {
            pointToLayer: feature => {
                if ( this.state.metric === 'temperature' ) {
                    var kelvin = parseFloat(feature.properties.values.temperature);
                    var english = ( kelvin - 273.15 ) * 1.8000 + 32.00;

                    return L.rectangle([[
                        feature.geometry.coordinates[1] - 0.125,
                        feature.geometry.coordinates[0] - 0.125
                    ], [
                        feature.geometry.coordinates[1] + 0.125,
                        feature.geometry.coordinates[0] + 0.125
                    ]], {
                        weight: 0,
                        clickable: false,
                        fillOpacity: 0.5,
                        fillColor: this.color( english )
                    });
                } else if ( this.state.metric === 'clouds' ) {
                    var cover = ( parseFloat( feature.properties.values.clouds ) / 100 ) * .5;

                    return L.rectangle([[
                        feature.geometry.coordinates[1] - 0.5,
                        feature.geometry.coordinates[0] - 0.5
                    ], [
                        feature.geometry.coordinates[1] + 0.5,
                        feature.geometry.coordinates[0] + 0.5
                    ]], {
                        weight: 0,
                        clickable: false,
                        fillOpacity: cover,
                        fillColor: '#000000'
                    });
                } else if ( this.state.metric === 'snow' ) {
                    var cover = (( parseFloat( feature.properties.values.snow_depth ) * 3.28084 ) / 2) * .5;

                    return L.rectangle([[
                        feature.geometry.coordinates[1] - 0.125,
                        feature.geometry.coordinates[0] - 0.125
                    ], [
                        feature.geometry.coordinates[1] + 0.125,
                        feature.geometry.coordinates[0] + 0.125
                    ]], {
                        weight: 0,
                        clickable: false,
                        fillOpacity: cover,
                        fillColor: '#0000FF'
                    });
                }
            }
        }).addTo( this.props.map );

        this.setState({
            pointsLayer: layer
        }, () => {
            if ( !this.state.animationID ) {
                this.props.map.fitBounds([[ country.latMin, country.lonMin ], [ country.latMax, country.lonMax ]]);
            }
        });
    },


    ////////////////
    // ANIMATIONS //
    ////////////////
    startAnimation( event ) {
        event.preventDefault();

        var self = this;

        let animationID = setInterval(() => {
            requestAnimationFrame(() => {
                let next = ( self.state.step < (self.state.timeline.length - 1) ) ? self.state.step + 1 : 0;

                self.setState({ step: next }, () => {
                    self.drawMap( false );
                });
            });
        }, 500);

        self.setState({
            animationID: animationID
        });
    },

    endAnimation( event ) {
        if ( event ) {
            event.preventDefault();
        }

        if ( this.state.animationID ) {
            clearInterval( this.state.animationID );
            this.setState({ animationID: false });
        }
    },


    ////////////////
    // COMPONENTS //
    ////////////////
    renderCountries() {
        return countries.map(( country, i ) => {
            return (
                <option value={ i } key={ i }>{ country.name }</option>
            );
        });
    },

    renderRange() {
        if ( this.state.timeline.length ) {
            return (
                <div>
                    <Range type="range" onChange={ this.changeStep } value={ this.state.step } min={ 0 } max={ this.state.timeline.length } />
                    { Moment( this.state.timeline[ this.state.step ] ).format('MM/D/YY, h:mma') }
                </div>
            );
        } else {
            return (
                <em>Select a country to continue...</em>
            );
        }
    },

    renderAnimationControl() {
        if ( this.state.timeline.length ) {
            if ( this.state.animationID ) {
                return (
                    <a href="#" onClick={ this.endAnimation }>
                        Stop
                    </a>
                );
            } else {
                return (
                    <a href="#" onClick={ this.startAnimation }>
                        Start
                    </a>
                );
            }
        } else {
            return null;
        }
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-4">
                    <h3>Choose a country</h3>

                    <Submittable onEnter={ this.changeCountry } onCancel={ this.clearCountry }>
                        <select ref="country" onChange={ this.changeCountry } defaultValue={ this.state.country }>
                            <option value="">Select a country...</option>
                            { this.renderCountries() }
                        </select>
                    </Submittable>
                </div>

                <div className="col-sm-8">
                    <Loader loaded={this.state.loaded} top="0" scale={.85}>
                        <div className="row">
                            <div className="col-sm-6">
                                <h3>Choose a time</h3>
                                { this.renderRange() }
                            </div>

                            <div className="col-sm-6">
                                <h3>Controls</h3>
                                { this.renderAnimationControl() }

                                <div className="metrics">
                                    <div onClick={ this.changeMetric.bind( this, 'temperature') }
                                        className={ this.state.metric === 'temperature' ? 'selected' : '' }>
                                        Temperature
                                    </div>

                                    <div onClick={ this.changeMetric.bind( this, 'clouds') }
                                        className={ this.state.metric === 'clouds' ? 'selected' : '' }>
                                        Clouds
                                    </div>

                                    <div onClick={ this.changeMetric.bind( this, 'snow') }
                                        className={ this.state.metric === 'snow' ? 'selected' : '' }>
                                        Snow
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Loader>
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
