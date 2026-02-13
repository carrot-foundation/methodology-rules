import { prepareDryRun } from './smaug-client';

jest.mock('@carrot-fndn/shared/http-request', () => ({
  httpRequest: jest.fn(),
}));

import { httpRequest } from '@carrot-fndn/shared/http-request';

const mockHttpRequest = httpRequest as jest.MockedFunction<typeof httpRequest>;

describe('prepareDryRun', () => {
  const smaugUrl = 'https://smaug.carrot.eco';

  const mockResponse = {
    auditDocumentId: 'audit-123',
    auditedDocumentId: 'mass-id-456',
    executionId: 'dry-run/uuid-789',
    rules: [
      {
        executionOrder: 1,
        ruleId: 'rule-1',
        ruleName: 'Document Manifest Data',
        ruleScope: 'MASS_ID',
        ruleSlug: 'document-manifest-data',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call Smaug dry-run prepare endpoint', async () => {
    mockHttpRequest.mockResolvedValue({ data: mockResponse } as never);

    const result = await prepareDryRun(smaugUrl, {
      documentId: 'mass-id-456',
      methodologySlug: 'bold-carbon-organic',
      rulesScope: 'MASS_ID',
    });

    expect(mockHttpRequest).toHaveBeenCalledWith({
      data: {
        documentId: 'mass-id-456',
        methodologySlug: 'bold-carbon-organic',
        rulesScope: 'MASS_ID',
      },
      method: 'POST',
      url: `${smaugUrl}/methodologies/dry-run/prepare`,
    });

    expect(result).toEqual(mockResponse);
  });

  it('should pass optional ruleSlug when provided', async () => {
    mockHttpRequest.mockResolvedValue({ data: mockResponse } as never);

    await prepareDryRun(smaugUrl, {
      documentId: 'mass-id-456',
      methodologySlug: 'bold-carbon-organic',
      ruleSlug: 'document-manifest-data',
      rulesScope: 'MASS_ID',
    });

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ruleSlug: 'document-manifest-data',
        }),
      }),
    );
  });
});
