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

test('reads a single project document', () => {
  const parsed = parseAndNormalizePnpmLockfile(project);
  assert.ok(parsed.importers['.'].devDependencies.nx);
});

test('reads the repository dependency graph with the native Nx parser', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '../..');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  );
  const parsed = parseAndNormalizePnpmLockfile(
    fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'),
  );
  assert.equal(
    parsed.importers['.'].specifiers.nx,
    manifest.devDependencies.nx,
  );
});
