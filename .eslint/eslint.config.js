const baseConfig = require('../eslint.config.js');

const packageDir = require.resolve('../package.json');

function getBaseEslintConfig({ projectPath, overrides = [] }) {
  return [
    ...baseConfig,
    {
      files: ['*.ts', '*.js'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          { packageDir: `${packageDir.split('/').slice(0, -1).join('/')}` },
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
