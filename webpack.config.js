module.exports = {
  entry: ['babel-polyfill', __dirname + '/src/hook.js'],
  output: {
    path: __dirname + '/build',
    filename: 'synteny-dotplot-builder.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }, { 
				test: /\.css$/, 
				loader: "style-loader!css-loader" 
			}, {
        // make all files ending in .json use the `json-loader`
        test: /\.json$/,
        loader: "json-loader"
      }
		]
  },
  resolve: {
    modulesDirectories: ['src', 'node_modules'],
    extensions: ['', '.js', '.json']
  },
  devtool: 'sourcemap'
};
