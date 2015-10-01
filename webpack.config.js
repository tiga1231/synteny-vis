module.exports = {
  entry: __dirname + '/src/top.js',
  output: {
    path: __dirname + '/build',
    filename: 'build.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  resolve: {
    modulesDirectories: ['src', 'node_modules'],
    extensions: ['', '.js']
  },
  devtool: 'sourcemap'
};
