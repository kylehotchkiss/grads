# GrADS Data Servers

Here are some known GrADS data servers and what data I think they represent. Also noted are current and desired weather models.

## NOAA Models

**http://nomads.ncep.noaa.gov:9090/dods/**

This software is primary for decoding the wealth of data that NOAA is generating.

* Currently Supported
    * **gfs_0p25**, **gfs_0p50**, **gfs_1p00**, **gfs2p5** [Global Forecast System](http://www.ncdc.noaa.gov/data-access/model-data/model-datasets/global-forcast-system-gfs)
    * **hrrr** [High-Resolution Rapid Refresh](http://ruc.noaa.gov/hrrr/)
    * **rap** [Rapid Refresh](http://rapidrefresh.noaa.gov/)
    * **wave** Various Wave Forecasting
* Future support
    * **aqm** Air Quality Model
    * **cmcens** Canada Meteorological Center Ensemble
    * **gens** [Global Ensemble Forecast System](https://www.ncdc.noaa.gov/data-access/model-data/model-datasets/global-ensemble-forecast-system-gefs)
    * **rtma2p5** Real-Time Mesoscale Analysis
* Other models, not interested in supporting
    * **akrtma** Real-Time Mesoscale Analysis (Alaska)
    * **estofs** Extratropical Surge and Tide Operational Forecast System (East Coast)
    * **estofs_pac** Extratropical Surge and Tide Operational Forecast System (West Coast)
    * **fens** Fleet Numerical Meteorology and Oceanography Ensemble Forecast System Ensemble
    * **fnl** *unknown*
    * **gens_bc** Global Ensemble Forecast System (Bias Corrected)
    * **gens_ndgd** Global Ensemble Forecast System (Bias Corrected and downscaled)
    * **gurtma** Real-Time Mesoscale Analysis (Guam)
    * **hiresw** High-Resolution Window (HIRESW) Forecast System
    * **hirtma** Real-Time Mesoscale Analysis (Hawaii)
    * **ice** Sea Ice Levels
    * **naefs_bc** North American Ensemble Forecast System (Bias Corrected)
    * **naefs_ndgd** North American Ensemble Forecast System (Bias Corrected and downscaled)
    * **nam** [North American Mesoscale Forecast System](https://www.ncdc.noaa.gov/data-access/model-data/model-datasets/north-american-mesoscale-forecast-system-nam)
    * **narre** North America Rapid Refresh Ensemble
    * **ncom** Navy Coastal Ocean Model
    * **ofs** [Operational Forecast System](https://tidesandcurrents.noaa.gov/models.html)
    * **prrtma** Real-Time Mesoscale Analysis (Puerto Rico)
    * **rtofs** [Global Real-Time Ocean Forecast System](http://polar.ncep.noaa.gov/global/)
    * **sref** Short Range Ensemble Forecast
    * **sref_bc** Short Range Ensemble Forecast (Bias Corrected)

## Sources

### Weather Tendency Data

**http://goldsmr3.sci.gsfc.nasa.gov/dods/**

If I were to build a trajectory predictor again, I would use this analysis to build my radius from launch site to make less requests of wind data

### Measurement Data

**http://www.usgodae.org/dods/GDS**

I **think** this is sensor data

### Historical Data

**http://agdisc.gsfc.nasa.gov/dods/**

Some of these have longer-term climate data


### Unknown

**http://apdrc.soest.hawaii.edu/dods/public_data/**

University of Hawaii has a wealth of data, but I don't really understand what it's for. Mostly ocean stuff.
