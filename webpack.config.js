const glob = require("glob");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");

module.exports = {
  entry: {
    index: glob.sync("./src/**/**/*.tsx")
  },
  target: "web",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader"
        ],
      },
      { 
        test: /\.(png|jpg|svg|gif)$/i, 
        use: ['file-loader'], 
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html", // Updated to point to public folder
      favicon: "./public/favicon.ico"  // Ensure favicon path matches the public folder
    }),
    new MiniCssExtractPlugin({
      filename: "index.css",
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true, // Cleans output folder before each build (optional, but good to add)
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
        extractComments: false,
    })],
  },
};
