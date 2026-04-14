import { getVitestBaseConfig } from './vitest.base.config';

export const getVitestE2EBaseConfig = (dirname: string) => {
  const base = getVitestBaseConfig(dirname);

  return {
    ...base,
    test: {
      ...base.test,

      // Only pick up files that opted into the e2e category via the
      // `.e2e.spec.*` / `.e2e.test.*` suffix. The unit target excludes these;
      // the e2e target is the one place they run.
      include: ['**/*.e2e.{test,spec}.{ts,js}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**',
      ],

      // Coverage is enforced by the unit target; e2e specs exercise the full
      // lambda path through the real document-query walker and would blow up
      // the coverage model if counted again.
      coverage: {
        ...base.test.coverage,
        enabled: false,
      },
    },
  };
};
