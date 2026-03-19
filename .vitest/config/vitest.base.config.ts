import { readFileSync } from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');

const readProjectName = (dirname: string): string => {
  const projectJsonPath = path.join(dirname, 'project.json');

  let raw: string;
  try {
    raw = readFileSync(projectJsonPath, 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to read ${projectJsonPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let parsed: { name?: string };
  try {
    parsed = JSON.parse(raw) as { name?: string };
  } catch (error) {
    throw new Error(
      `Failed to parse ${projectJsonPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed.name) {
    throw new Error(
      `Missing "name" field in ${projectJsonPath}. Every project must have a name for Vitest config.`,
    );
  }

  return parsed.name;
};

export const getVitestBaseConfig = (dirname: string) => {
  const name = readProjectName(dirname);

  const getVitestSetupPath = (filePath: string) =>
    path.join(workspaceRoot, '.vitest', filePath);

  return {
    resolve: {
      tsconfigPaths: true,
    },
    oxc: false as const,
    test: {
      name,
      globals: true,
      environment: 'node',

      // Performance
      pool: 'threads',
      maxWorkers: 1,
      isolate: true,
      watch: false,
      passWithNoTests: false,

      include: ['**/*.{test,spec}.{ts,js}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**',
        '**/*.e2e.spec.{ts,js}',
        '**/*.e2e.test.{ts,js}',
      ],

      testTimeout: 10_000,
      hookTimeout: 10_000,

      // Mock reset behavior (clearMocks + restoreMocks matches Jest's resetMocks;
      // mockReset is omitted because it resets vi.mock() factory implementations,
      // which Jest's resetMocks does not do)
      clearMocks: true,
      restoreMocks: true,

      // Coverage configuration
      coverage: {
        enabled: true,
        provider: 'v8' as const,
        all: true,
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
          '**/*.lambda.ts',
          '**/rule-definition.ts',
          '**/*.rule-definition.ts',
          '**/*.errors.ts',
          '**/*.types.ts',
          '**/*.provider.ts',
          '**/*.constants.ts',
          '**/defaults.ts',
          '**/testing.helpers.ts',
          '**/main.ts',
          '**/*.command.ts',
          '**/*.prompts.ts',
          '**/*.formatter.ts',
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
