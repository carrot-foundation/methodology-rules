const path = require('path');
const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  config.devtool = 'source-map';
  config.optimization.usedExports = true;
  config.mode = 'production';

  // Required for AWS Lambda
  config.output.library = {
    type: 'commonjs2'
  };

  // Codecov bundle analysis: uploads bundle-size stats during build. Gated behind CODECOV_TOKEN + CI to avoid upload attempts locally.
  if (process.env.CODECOV_TOKEN && process.env.CI) {
    let codecovWebpackPlugin;
    try {
      ({ codecovWebpackPlugin } = require('@codecov/webpack-plugin'));
    } catch (error) {
      throw new Error(
        'CODECOV_TOKEN is set but @codecov/webpack-plugin is not installed. ' +
        'Run "pnpm install" to install dev dependencies, or unset CODECOV_TOKEN. ' +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const outputPath = config.output?.path;
    if (!outputPath) {
      throw new Error(
        'CODECOV_TOKEN is set but config.output.path is not defined. ' +
        'Cannot determine bundle name for Codecov bundle analysis.'
      );
    }
    const bundleName = path.basename(outputPath);
    config.plugins = config.plugins || [];
    config.plugins.push(
      codecovWebpackPlugin({
        enableBundleAnalysis: true,
        bundleName,
        uploadToken: process.env.CODECOV_TOKEN,
      }),
    );
  }

  return config;
});
