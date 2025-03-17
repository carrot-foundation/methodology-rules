import type { Config } from 'jest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const getJestBaseConfig = (dirname: string): Config => {
  const { name } = JSON.parse(
    readFileSync(path.join(dirname, 'project.json'), 'utf8'),
  );

  const getFilePath = (filePath: string) =>
    path.relative(dirname, `${process.cwd()}/${filePath}`);

  return {
    preset: getFilePath('jest.preset.js'),
    moduleFileExtensions: ['ts', 'js', 'html', 'json'],
    displayName: name,
    coveragePathIgnorePatterns: [
      '<rootDir>/src/.*\\.(typia|stubs)\\.ts$',
      '<rootDir>.*typia\\.matchers\\.ts$',
      '<rootDir>/src/.*\\.test-cases\\.ts$',
    ],
    setupFiles: [`${__dirname}/dotenv-config.ts`],
    setupFilesAfterEnv: [`${__dirname}/setup-after-env.ts`],
    coverageThreshold: {
      global: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  };
};
