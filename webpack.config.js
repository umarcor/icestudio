'use strict';

const webpack = require('webpack');
const join = require('path').join;

module.exports = {
  entry: join(__dirname, 'app', 'app.js'),
  target: 'node',
  output: {
    path: join(__dirname, 'app', 'app'),
    filename: 'main.js'
  },
  devtool: 'source-map',
//  optimization: { minimize: false },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    //new HtmlWebpackPlugin({ template: './app/index.html' }),
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      jquery: 'jquery',
      'window.jQuery': 'jquery'
    }),
  ],
  //devServer: {
  //  port: 5000,
  //  contentBase: './src/',
  //  historyApiFallback: true
  //}
};
