var path = require('path');
var webpack = require('webpack');

module.exports = {
    quiet: true,
    noInfo: true,
    devtool: 'eval',
    entry: [ './demo/react/app.jsx' ],
    resolve: { extensions: ['', '.js', '.jsx', '.json'] },    
    output: {
        path: 'public/assets/scripts',
        filename: 'react-forecast.js',
        publicPath: 'http://localhost:3100/'
    },
    plugins: [
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.UglifyJsPlugin({ minimize: true }),
    ],
    module: {
        loaders: [{
            test: /\.jsx?$/,
            exclude: /node_modules/,
            include: path.join(__dirname, 'demo'),
            loaders: [ 'babel-loader?presets[]=es2015,presets[]=react' ]
        }]
    }
};
