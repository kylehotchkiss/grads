# GrADS

Javascript-based GrADS (Grid Analysis and Display System) Data Server client. Primarily an API for accessing weather forecast/climate data for a location or area. Currently, acccesses a few GFS variables but working to include the majority of human-usable variables (do you care about surface flux or gravity wave stuff? I don't!)

Applications & Implementation ideas:

* (originally) trajectory prediction for weather balloons & payloads
* Access weather conditions via forecast (weather model, not sensors) for nearly any point on planet.
* Access wave conditions for a majority of the water on the planet (weather model, not sensors)
* Visualize weather conditions for an entire country at once. Quite interesting seeing this on poorer countries.
* Potientally create a forecast broadcast system for small countries with a small decoding device.

GrADS is a beast of a server to access. I've worked on this code for several years now and finally am comfortable that I'm doing it right. 

# Usage
Right now, the API only works for simple requests (single location). Access it like so -

    https://grads.herokuapp.com/conditions?lat=x&lon=x&alt=x&model=[rap|gfshd|gfs]

The first three parameters are fairly straightforward. Altitude needs to be provided in Meters. The `model` option is optional, as the best model for your location will be chosen if you leave it blank.

You will get back the following data:

```
    {
        conditions: {
            wind: {
                velocity: ,
                heading:
            }
        },
        location: {
            lat: ,
            lon: ,
            alt:
        }
        meta: {
            request: {
                wind: {
                    u_component
                    v_component
                    pressure_altitude:
                }
            },
            timestamp: ,
            version: ,
        }
    }
```


# TODO
This is based off some code I wrote years ago so it's pretty simple for now. Eventually, it'd be nice to have the following features:

* Redis Caching
* Rate Limiting
* Batch requests for surrounding locations
    * `eager_v` option to preload vertical data, `eager_h` to preload horizontal data.
* Wind predictions


# In the Future
Some cool data for the intended use case (physics simulation) would be to implement the following available datasets (from http://ruc.noaa.gov/rr/RAP_var_diagnosis.html) -

* Sea-level Pressure  
* Cloud Cover
* Vertical Velocity


# Notes
    * I'm not sure if this breaks a NOAA "term of service".
