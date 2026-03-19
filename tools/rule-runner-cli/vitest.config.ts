import { getVitestBaseConfig } from '../../.vitest/config/vitest.base.config';
import { getVitestBasePlugins } from '../../.vitest/config/vitest.base.plugins';

const baseConfig = getVitestBaseConfig(import.meta.dirname);

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      exclude: [
        ...(baseConfig.test.coverage.exclude ?? []),
        '**/commands/run.command.ts',
        '**/commands/run.handler.ts',
        '**/commands/run-batch.handler.ts',
        '**/commands/dry-run.command.ts',
        '**/commands/dry-run-batch.command.ts',
        '**/commands/dry-run-batch.handler.ts',
        '**/utils/processor-loader.ts',
      ],
    },
  },
  plugins: getVitestBasePlugins({ dirname: import.meta.dirname }),
};
