const webpack = require('webpack');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
//const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin');
//const MiniCssExtractPlugin = require("mini-css-extract-plugin");
//const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

const config = {
	mode: 'development',
	entry: {
		'vendor': './app/js/_vendor.js',
		'app': './app/js/app.js'
	},
	devtool: 'source-map',
	output: {
		filename: 'libs/[name].bundle.js',
		path: path.resolve(__dirname, 'build')
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: ['ng-annotate-loader', 'babel-loader']
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.(scss)$/,
				use: [
					{ loader: "style-loader" },
					{ loader: "css-loader", options: { minimize: true } },
					{ loader: "sass-loader" }
				]
			},
			// for fixing of loading bootstrap icon files
			{
				test: /\.(png|jpg|jpeg|gif|svg|woff|woff2)$/,
				loader: 'url-loader?limit=10000',
				options: {
					name: './fonts/[name].[ext]'
				}
			},
			{
				test: /\.(eot|ttf)$/,
				loader: 'file-loader',
				options: {
					name: './fonts/[name].[ext]'
				}
			},
			{ test: /\.html$/, loader: 'html-loader' }
		]
	},
//	optimization: {
//		minimizer: [
//			new UglifyJsPlugin({
//				cache: true,
//			}),
//			new OptimizeCssAssetsWebpackPlugin({})
//		]
//	},
	plugins: [
		new CleanWebpackPlugin(),
		new HtmlWebpackPlugin({ template: './app/index.html' }),
		new webpack.ProvidePlugin({
			jQuery: 'jquery',
			$: 'jquery',
			jquery: 'jquery'
		}),
		//new MiniCssExtractPlugin({
		//	filename: "styles/[name].[hash].css",
		//	chunkFilename: "styles/[id].[hash].css"
		//})
	],
	devServer: {
		port: 5000,
		contentBase: './src/',
		historyApiFallback: true
	}
};

module.exports = config;
