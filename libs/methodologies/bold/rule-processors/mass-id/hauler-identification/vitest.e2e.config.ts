import { getVitestE2EBaseConfig } from '../../../../../../.vitest/config/vitest.e2e.base.config';
import { getVitestBasePlugins } from '../../../../../../.vitest/config/vitest.base.plugins';

export default {
  ...getVitestE2EBaseConfig(import.meta.dirname),
  plugins: getVitestBasePlugins(),
};
