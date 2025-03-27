import { AUDIT_API_URL_MAP } from './audit-api.constants';

interface Constants {
  AUDIT_API_URL: string;
  AUDIT_API_URL_MAP: typeof AUDIT_API_URL_MAP;
}

describe('Audit API Constants', () => {
  let originalEnvironment: string | undefined;

  beforeEach(() => {
    originalEnvironment = process.env['ENVIRONMENT'];
  });

  afterEach(() => {
    process.env['ENVIRONMENT'] = originalEnvironment;
    jest.resetModules();
  });

  describe('AUDIT_API_URL', () => {
    it('should use development URL when ENVIRONMENT is set to development', () => {
      process.env['ENVIRONMENT'] = 'development';
      jest.resetModules();
      const constants = require('./audit-api.constants') as Constants;

      expect(constants.AUDIT_API_URL).toBe(AUDIT_API_URL_MAP.development);
    });

    it('should use production URL when ENVIRONMENT is set to production', () => {
      process.env['ENVIRONMENT'] = 'production';
      jest.resetModules();
      const constants = require('./audit-api.constants') as Constants;

      expect(constants.AUDIT_API_URL).toBe(AUDIT_API_URL_MAP.production);
    });

    it('should default to development URL when ENVIRONMENT is not set', () => {
      delete process.env['ENVIRONMENT'];
      jest.resetModules();
      const constants = require('./audit-api.constants') as Constants;

      expect(constants.AUDIT_API_URL).toBe(AUDIT_API_URL_MAP.development);
    });

    it('should throw an error when ENVIRONMENT is invalid', () => {
      process.env['ENVIRONMENT'] = 'invalid';
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
