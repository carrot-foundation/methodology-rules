jest.mock('@carrot-fndn/shared/env', () => ({
  getAuditUrl: () => mockAuditUrl,
  getOptionalEnv: jest.fn(),
}));

let mockAuditUrl: string | undefined;

describe('Audit API Constants', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('AUDIT_API_URL', () => {
    it('should use the value from getAuditUrl', () => {
      mockAuditUrl = 'https://test.carrot.eco';
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AUDIT_API_URL } = require('./audit-api.constants');

      expect(AUDIT_API_URL).toBe('https://test.carrot.eco');
    });

    it('should use undefined when AUDIT_URL is not set', () => {
      mockAuditUrl = undefined;
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AUDIT_API_URL } = require('./audit-api.constants');

      expect(AUDIT_API_URL).toBeUndefined();
    });
  });
});
