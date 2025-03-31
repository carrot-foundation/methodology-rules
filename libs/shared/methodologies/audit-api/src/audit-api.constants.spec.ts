describe('Audit API Constants', () => {
  let originalAuditUrl: string | undefined;

  beforeEach(() => {
    originalAuditUrl = process.env['AUDIT_URL'];
  });

  afterEach(() => {
    process.env['AUDIT_URL'] = originalAuditUrl;
    jest.resetModules();
  });

  describe('AUDIT_API_URL', () => {
    it('should use the value from AUDIT_URL environment variable', () => {
      process.env['AUDIT_URL'] = 'https://test.carrot.eco';
      jest.resetModules();
      const { AUDIT_API_URL } = require('./audit-api.constants');

      expect(AUDIT_API_URL).toBe('https://test.carrot.eco');
    });

    it('should throw an error when AUDIT_URL is not defined', () => {
      delete process.env['AUDIT_URL'];
      jest.resetModules();

      let error: Error | null = null;

      try {
        require('./audit-api.constants');
      } catch (error_) {
        error = error_ as Error;
      }

      expect(error).not.toBeNull();
    });

    it('should throw an error when AUDIT_URL is not a valid URI', () => {
      process.env['AUDIT_URL'] = 'not-a-valid-uri';
      jest.resetModules();

      let error: Error | null = null;

      try {
        require('./audit-api.constants');
      } catch (error_) {
        error = error_ as Error;
      }

      expect(error).not.toBeNull();
    });
  });
});
