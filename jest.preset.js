const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testTimeout: 10_000,
  testEnvironment: 'node',
  coverageReporters: [['text', 'html', { skipFull: true }]],
};
