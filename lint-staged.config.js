module.exports = {
  '*': 'prettier --write --ignore-unknown',
  '**/*.[jt]s?(x)': () => 'nx affected --target=lint --fix',
  'package.json': 'npmPkgJsonLint .',
  'tsconfig.base.json': () => 'nx format:write --files tsconfig.base.json',
};
