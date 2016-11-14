var path = require('path');
var webpack = require('webpack');

module.exports = {
  devtool: 'cheap-module-eval-source-map',
  entry: [
    'webpack-hot-middleware/client',
    path.resolve('./src/client/index')
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/static/'
  },
  module: {
    /*preLoaders: [
      {
        test: /\.jsx?$/,
        loaders: ['eslint'],
        include: path.resolve('./src/client')
      }
    ],*/
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: [/node_modules/, 'src/server/'],
        query: {
            presets:['react', 'es2015', 'stage-2']
        },
        include: __dirname
      },
      {
        test: /\.scss$/,
        //loader: "style-loader!raw-loader!sass-loader?includePaths[]=" + path.resolve('./node_modules/compass-mixins/lib')+","+path.resolve('./node_modules/react-datetime')
        loader: "style-loader!raw-loader!sass-loader?includePaths[]=" + path.resolve('./node_modules/react-datetime/css')+":"+path.resolve('./node_modules/compass-mixins/lib')
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loaders: [
            'file?hash=sha512&digest=hex&name=[hash].[ext]',
              'image-webpack?bypassOnDebug&optimizationLevel=7&interlaced=false'
        ]
      }
    ]
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development')
    })
  ],
  resolve: {
    extensions: ['', '.js']
  }
}
