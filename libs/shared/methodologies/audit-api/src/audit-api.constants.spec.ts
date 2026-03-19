jest.mock('@carrot-fndn/shared/env', () => ({
  getAuditUrl: () => mockAuditUrl,
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

    it('should throw when getAuditUrl throws', () => {
      jest.resetModules();
      jest.doMock('@carrot-fndn/shared/env', () => ({
        getAuditUrl: () => {
          throw new Error('AUDIT_URL is required');
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
      expect(() => require('./audit-api.constants')).toThrow();
    });
  });
});
