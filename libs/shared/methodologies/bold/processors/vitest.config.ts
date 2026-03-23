import { getVitestBaseConfig } from '../../../../../.vitest/config/vitest.base.config';
import { getVitestBasePlugins } from '../../../../../.vitest/config/vitest.base.plugins';

export default {
  ...getVitestBaseConfig(import.meta.dirname),
  plugins: getVitestBasePlugins(),
};
