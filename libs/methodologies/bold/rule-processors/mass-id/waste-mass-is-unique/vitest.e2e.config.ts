import { getVitestE2EBaseConfig } from '../../../../../../.vitest/config/vitest.e2e.base.config';
import { getVitestBasePlugins } from '../../../../../../.vitest/config/vitest.base.plugins';

const base = getVitestE2EBaseConfig(import.meta.dirname);

export default {
  ...base,
  plugins: getVitestBasePlugins(),
  test: {
    ...base.test,
    // `waste-mass-is-unique.helpers.e2e.spec.ts` hits the real audit-api
    // (`smaug.carrot.eco/documents`) during `beforeAll` via `seedDocument`
    // and requires live AWS credentials. It can't run under the standard
    // test-e2e target; leave it for a future live-AWS runner.
    exclude: [
      ...base.test.exclude,
      '**/waste-mass-is-unique.helpers.e2e.spec.ts',
    ],
  },
};
