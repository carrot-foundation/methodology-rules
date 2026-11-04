const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  parseAndNormalizePnpmLockfile,
} = require('nx/src/plugins/js/lock-file/utils/pnpm-normalizer');

const project = `lockfileVersion: '9.0'
importers:
  .:
    devDependencies:
      nx:
        specifier: 1.0.0
        version: 1.0.0
packages: {}
snapshots: {}
`;

for (const [name, content] of [
  ['one project document', project],
  [
    'boot and project documents',
    `---\nlockfileVersion: '9.0'\nimporters: {}\npackages: {}\nsnapshots: {}\n---\n${project}`,
  ],
]) {
  test(`reads the application graph from ${name}`, () => {
    const parsed = parseAndNormalizePnpmLockfile(content);
    assert.ok(parsed.importers['.'].devDependencies.nx);
  });
}
