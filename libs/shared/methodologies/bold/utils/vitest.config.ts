import { getVitestBaseConfig } from '../../../../../.vitest/config/vitest.base.config';
import { getVitestBasePlugins } from '../../../../../.vitest/config/vitest.base.plugins';

const baseConfig = getVitestBaseConfig(import.meta.dirname);

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      exclude: [
        ...(baseConfig.test.coverage.exclude ?? []),
        '**/validators.ts',
      ],
    },
  },
  plugins: getVitestBasePlugins({ dirname: import.meta.dirname }),
};
