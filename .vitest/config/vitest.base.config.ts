import { readFileSync } from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');

export const getVitestBaseConfig = (dirname: string) => {
  const { name } = JSON.parse(
    readFileSync(path.join(dirname, 'project.json'), 'utf8'),
  );

  const getVitestSetupPath = (filePath: string) =>
    path.join(workspaceRoot, '.vitest', filePath);

  return {
    test: {
      name,
      globals: true,
      environment: 'node',

      // Performance
      pool: 'threads',
      maxWorkers: 1,
      isolate: true,
      watch: false,
      passWithNoTests: true,

      include: ['**/*.{test,spec}.{ts,js}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**',
      ],

      testTimeout: 10_000,
      hookTimeout: 10_000,

      // Mock reset behavior
      clearMocks: true,
      mockReset: true,
      restoreMocks: true,

      // Coverage configuration
      coverage: {
        enabled: true,
        provider: 'v8' as const,
        include: ['src/**/*.{ts,js}'],
        exclude: [
          '**/*.spec.{ts,js}',
          '**/*.test.{ts,js}',
          '**/*.stubs.ts',
          '**/*.test-cases.ts',
          '**/zod.matchers.ts',
          '**/testing/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/coverage/**',
          '**/index.ts',
          '**/logger.helpers.ts',
          '**/lambda.ts',
          '**/rule-definition.ts',
          '**/*.rule-definition.ts',
          '**/*.errors.ts',
        ],
        thresholds: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
        reportsDirectory: path.join(workspaceRoot, 'coverage', name),
      },

      setupFiles: [getVitestSetupPath('setup/vitest.setup.ts')],
    },
  };
};
