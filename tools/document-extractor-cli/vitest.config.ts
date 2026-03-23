import { getVitestBaseConfig } from '../../.vitest/config/vitest.base.config';
import { getVitestBasePlugins } from '../../.vitest/config/vitest.base.plugins';

const baseConfig = getVitestBaseConfig(import.meta.dirname);

export default {
  ...baseConfig,
  plugins: getVitestBasePlugins(),
  test: {
    ...baseConfig.test,
    coverage: {
      ...baseConfig.test.coverage,
      // CLI handlers and formatters rely on dynamic imports and process I/O that
      // cause v8 coverage instrumentation to report false uncovered branches.
      // These files are tested via integration but excluded from coverage
      // thresholds to avoid false negatives from v8 instrumentation.
      exclude: [
        ...baseConfig.test.coverage.exclude,
        '**/commands/extract.command.ts',
        '**/commands/extract.handler.ts',
        '**/formatters/*.ts',
        '**/utils/register-imports.ts',
      ],
    },
  },
};
