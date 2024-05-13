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
    setupFiles: [__dirname + '/dotenv-config.ts'],
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
