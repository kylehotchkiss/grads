import React from 'react';
import Moment from 'moment';
import Range from 'react-range';
import Loader from 'react-loader';
import Submittable from 'react-submittable';
import { countries, states } from 'json!../../data/places.json';

module.exports = {
    renderPlaces() {
        return (
            <div className="controls-country">
                <h3>Location</h3>

                <select ref="place" onChange={ this.changePlace } defaultValue={ this.state.place } className="form-control">
                    <option value="">Select a location...</option>
                    <optgroup label="Countries">
                        {countries.map(( country, i ) => {
                            return (
                                <option value={ country.name + ' ' } key={ i }>{ country.name }</option>
                            );
                        })}
                    </optgroup>
                    <optgroup label="States">
                        {states.map(( state, i ) => {
                            return (
                                <option value={ state.name } key={ i }>{ state.name }</option>
                            );
                        })}
                    </optgroup>
                </select>
            </div>
        );
    },

    renderModels() {
        return (
            <div className="controls-models">
                <h3>Forecast Model</h3>

                <select ref="model" onChange={ this.changeModel } defaultValue={ this.state.model } className="form-control">
                    <optgroup name="Global">
                        <option name="gfs">GFS: Global Forecast System</option>
                        <option name="cmcens" disabled>CMCENS: Canada Meteorological Center Ensemble</option>
                        <option name="cmcens" disabled>GENS: Global Ensemble Forecast System</option>
                    </optgroup>
                    <optgroup name="USA Only">
                        <option name="rap">RAP: Rapid Refresh</option>
                        <option name="ruc" disabled>RUC: Rapid Update Cycle</option>
                        <option name="hrr" disabled>HRRR: High Resolution Rapid Update Cycle</option>
                    </optgroup>
                </select>
            </div>
        );
    },

    renderDropdowns( margin ) {
        return (
            <div className="col-sm-3" style={{ marginLeft: margin + '%' }}>
                { this.renderPlaces() }
                { this.renderModels() }
            </div>
        );
    },

    renderTimeline() {
        let datesShown = [];
        let percentage = ( this.state.step / this.state.timeline.length ) * 100 || 0;

        return (
            <div className="controls-time">
                <div className="row">
                    <div className="col-sm-12">
                        <div className="timeline">
                            <div className="bar">
                                {this.state.timeline.map( ( date, i ) => {
                                    let percent = ( i / this.state.timeline.length ) * 100;
                                    let interval = this.state.timeline / 20;
                                    let formattedDate = Moment( date ).format('MM/D')
                                    let formattedTime = Moment( date ).format('ha');
                                    let showDate = ( datesShown.indexOf( formattedDate ) === -1 );
                                    datesShown.push( formattedDate );

                                    return (
                                        <div className="stop" key={ i } style={{ 'left': `${ percent }%` }}>
                                            { formattedTime }
                                            <br />
                                            { showDate && formattedDate }
                                        </div>
                                    )
                                })}
                                <div className="cursor" style={{ 'left': `${ percentage }%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    renderAnimationControls() {
        return (
            <div className="col-sm-3">
                {this.state.animationID ?
                    <a href="#" onClick={ this.endAnimation }>Stop</a> :
                    <a href="#" onClick={ this.startAnimation }>Start</a>
                }
            </div>
        )
    },

    renderMetrics() {
        return (
            <div className="col-sm-6 controls-metrics">
                <h3>Visualize</h3>

                <div className="row">
                    <div onClick={ this.changeMetric.bind( this, 'temperature') } className="col-sm-3 metric">
                        <div className={ this.state.metric === 'temperature' ? 'selected' : '' }>
                            <i className="ss-thermometer"></i>
                            Temp
                        </div>
                    </div>

                    <div onClick={ this.changeMetric.bind( this, 'pressure') } className="col-sm-3 metric">
                        <div className={ this.state.metric === 'pressure' ? 'selected' : '' }>
                            <i className="ss-smoke"></i>
                            Pressure
                        </div>
                    </div>

                    <div onClick={ this.changeMetric.bind( this, 'clouds') } className="col-sm-3 metric">
                        <div className={ this.state.metric === 'clouds' ? 'selected' : '' }>
                            <i className="ss-clouds"></i>
                            Clouds
                        </div>
                    </div>

                    <div onClick={ this.changeMetric.bind( this, 'snow') }  className="col-sm-3 metric">
                        <div className={ this.state.metric === 'snow' ? 'selected' : '' }>
                            <i className="ss-snowflakes"></i>
                            Snow Depth
                        </div>
                    </div>

                    <div onClick={ this.changeMetric.bind( this, 'wind') }  className="col-sm-3 metric">
                        <div className={ this.state.metric === 'wind' ? 'selected' : '' }>
                            <i className="ss-wind"></i>
                            Wind
                        </div>
                    </div>
                </div>
            </div>
        )
    },

    render() {
        if ( !this.state.place ) {
            return (
                <div className="controls">
                    { this.renderTimeline() }

                    <div className="row">
                        { this.renderDropdowns( 33 ) }
                    </div>
                </div>
            );
        } else if ( !this.state.loaded ) {
            return (
                <div className="controls">
                    { this.renderTimeline() }

                    <div className="row">
                        { this.renderDropdowns( 0 ) }

                        <div className="col-sm-6">
                            <Loader loaded={ false } top="0" scale={.85}></Loader>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="controls">
                    { this.renderTimeline() }

                    <div className="row">
                        { this.renderDropdowns( 0 ) }
                        { this.renderMetrics() }
                        { this.renderAnimationControls() }
                    </div>
                </div>
            );
        }
    }
}
