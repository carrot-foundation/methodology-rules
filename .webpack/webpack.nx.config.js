const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  config.devtool = 'source-map';
  config.optimization.usedExports = true;
  config.mode = 'production';

  // Required for AWS Lambda
  config.output.library = {
    type: 'commonjs2'
  };

  for (const rule of config.module.rules) {
    if (rule.loader?.includes('ts-loader')) {
      rule.options = {
        transpileOnly: false,
        compiler: 'ts-patch/compiler',
      };
    }
  }

  return config;
});
