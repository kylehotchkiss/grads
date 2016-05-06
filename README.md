# GrADS [![Circle CI](https://circleci.com/gh/kylehotchkiss/grads/tree/master.svg?style=svg)](https://circleci.com/gh/kylehotchkiss/grads/tree/master)

Javascript-based GrADS (Grid Analysis and Display System) Data Server client. Primarily an API for accessing weather forecast/climate data for a location or area. Currently, acccesses a few GFS variables but working to include the majority of human-usable variables (do you care about surface flux or gravity wave stuff? I don't!)

_Note: while this application does provide access to very detailed and useful weather/climate metrics in a very pragmatic way, please do not use it to provide on-demand weather data to end users. It makes a request to NOAA for every variable, every time you need to access it, minus a short cache of previously directed variables. [Weather Underground provides a more suitable API for this purpose](http://www.wunderground.com/weather/api/). This application was intended for modelling and research purposes only._

Applications & Implementation ideas:

* (originally) trajectory prediction for weather balloons & payloads
* Access weather conditions via forecast (weather model, not sensors) for nearly any point on planet.
* Access wave conditions for a majority of the water on the planet (weather model, not sensors)
* Visualize weather conditions for an entire country at once. Quite interesting seeing this on poorer countries.
* Potientally create a forecast broadcast system for small countries with a small decoding device.

GrADS is a beast of a server to access. I've worked on this code for several years now and finally am comfortable that I'm doing it right.

## Usage

Coming soon!

Basically:

    var grads = new Grads( lat(decimal), lon(decimal), alt(meters), time(JS Time), model(optional) );

    grads.fetch('temperature', function( values, config ) {
        var tempInKelvin = values[0][0][0].values.temperature;
    });

# TODO
This is based off some code I wrote years ago so it's pretty simple for now. Eventually, it'd be nice to have the following features:

* Working/selectable time ranges
* Auto-selection of most "valuable" model


# In the Future
Some cool data for the intended use case (physics simulation) would be to implement the following available datasets (from http://ruc.noaa.gov/rr/RAP_var_diagnosis.html) -

* Vertical Velocity

# Notes
    * I'm not sure if this breaks a NOAA "term of service".
