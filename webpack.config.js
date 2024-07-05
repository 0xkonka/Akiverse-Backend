const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WriteFilePlugin = require("write-file-webpack-plugin");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: {
    confirmer: "./src/apps/confirmer/confirmer.ts",
    executor: "./src/apps/executor/executor.ts",
    fee_collector: "./src/apps/fee_collector/index.ts",
    play_manager: "./src/apps/play_manager/play_manager.ts",
    server: "./src/apps/server/index.ts",
    watcher: "./src/apps/watcher/watcher.ts",
    pfp_icon_checker: "./src/apps/pfp_icon_checker/index.ts",
    rovi_tournament_manager: "./src/apps/rovi_tournament_manager/index.ts",
    paid_tournament_manager: "./src/apps/paid_tournament_manager/index.ts",
  },
  target: "node",
  devtool: "inline-source-map",
  plugins: [
    // Prismaがネイティブモジュールとschema.prismaファイルがないと動作しないのでコピーする
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./prisma/schema.prisma",
          to: "./schema.prisma",
        },
        {
          from: "./node_modules/.prisma/client/*.node",
          to({ context, absoluteFilename }) {
            return Promise.resolve("[name][ext]");
          },
        },
      ],
    }),
    new WriteFilePlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".mjs", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "commonjs2",
  },
  mode: "development",
  optimization: {
    usedExports: true,
  },
  externalsPresets: { node: true },
  externals: [nodeExternals()],
};
