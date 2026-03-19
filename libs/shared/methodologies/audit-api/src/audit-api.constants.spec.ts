let mockAuditUrl: string | undefined;

vi.mock('@carrot-fndn/shared/env', () => ({
  getAuditUrl: () => mockAuditUrl,
}));

describe('Audit API Constants', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('AUDIT_API_URL', () => {
    it('should use the value from getAuditUrl', async () => {
      mockAuditUrl = 'https://test.carrot.eco';
      vi.resetModules();
      const { AUDIT_API_URL } = await import('./audit-api.constants');

      expect(AUDIT_API_URL).toBe('https://test.carrot.eco');
    });

    it('should throw when getAuditUrl throws', async () => {
      vi.resetModules();
      vi.doMock('@carrot-fndn/shared/env', () => ({
        getAuditUrl: () => {
          throw new Error('AUDIT_URL is required');
        },
      }));

      await expect(() => import('./audit-api.constants')).rejects.toThrow();
    });
  });
});
