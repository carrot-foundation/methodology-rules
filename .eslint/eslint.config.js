const path = require('path');

function getBaseEslintConfig({ projectPath, overrides = [] }) {
  return {
    extends: [path.join(__dirname, '../.eslintrc.js')],
    ignorePatterns: ['!**/*'],
    overrides: [
      {
        files: ['*.ts', '*.js'],
        rules: {
          'import/no-extraneous-dependencies': [
            'error',
            { packageDir: `${process.cwd()}` },
          ],
        },
      },
      {
        files: ['*.ts'],
        parserOptions: {
          project: `${projectPath}/tsconfig.eslint.json`,
          ecmaVersion: 2023,
          lib: ['es2022'],
        },
      },
      ...overrides,
    ],
  };
}

module.exports = {
  getBaseEslintConfig,
};
