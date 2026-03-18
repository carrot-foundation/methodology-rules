const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  config.devtool = 'source-map';
  config.optimization.usedExports = true;
  config.mode = 'production';

  // Required for AWS Lambda
  config.output.library = {
    type: 'commonjs2'
  };

  return config;
});
