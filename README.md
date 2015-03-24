# Grads

This is the source code to a small API server that can be used to get simple data about wind for nearly any point on the globe, and many miles above it. It's based on NOAA's various weather data available in GRaDS, which is a live but complex 3D grid dataset created for visualizations and predictions. I've found this data accurate enough for things like trajectory predictions for ballooning, and think it would be nice for other sorts of physics simulation work as well.

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
* Vertical Velocity


# Notes

* I'm not sure if this breaks a NOAA "term of service".
