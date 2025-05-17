module.exports = {
  '*': 'prettier --write --ignore-unknown',
  '**/*.{[jt]s?(x),yaml,json}': 'eslint --fix',
  'package.json': 'npmPkgJsonLint .',
  'tsconfig.base.json': () => 'nx format:write --files tsconfig.base.json',
};
