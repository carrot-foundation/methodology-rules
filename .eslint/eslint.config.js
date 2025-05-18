const baseConfig = require('../eslint.config.js');
const path = require('path');

const packageDir = require.resolve('../package.json');

function getBaseEslintConfig({ projectPath, overrides = [] }) {
  return [
    ...baseConfig,
    // '!**/*' pattern is required to run ESLint on all files using Nx to compensate the lint-staged config pattern '**/*' on the root config
    { ignores: ['!**/*', '**/*.config.js'] },
    {
      files: ['*.ts', '*.js'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          { packageDir: path.dirname(packageDir) },
        ],
      },
    },
    {
      files: ['*.ts'],
      languageOptions: {
        parserOptions: {
          project: `${projectPath}/tsconfig.eslint.json`,
          ecmaVersion: 2023,
          lib: ['es2022'],
        },
      },
    },
    ...overrides,
  ];
}
module.exports = { getBaseEslintConfig };
