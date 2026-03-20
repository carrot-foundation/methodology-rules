import { getVitestBaseConfig } from '../../../../.vitest/config/vitest.base.config';
import { getVitestBasePlugins } from '../../../../.vitest/config/vitest.base.plugins';

const baseConfig = getVitestBaseConfig(import.meta.dirname);

export default {
  ...baseConfig,
  plugins: getVitestBasePlugins({ dirname: import.meta.dirname }),
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      enabled: false,
    },
  },
};
