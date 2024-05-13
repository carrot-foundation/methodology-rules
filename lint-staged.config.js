module.exports = {
  '*': 'prettier --write --ignore-unknown',
  '**/*.{[jt]s,yaml,json}': 'eslint --fix',
  '*': 'cspell --no-must-find-files',
  'package.json': 'npmPkgJsonLint .',
};
