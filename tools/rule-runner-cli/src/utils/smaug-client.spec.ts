import { provideSmaugApiCredentials } from '@carrot-fndn/shared/aws-http';
import { httpRequest } from '@carrot-fndn/shared/http-request';

import { prepareDryRun, prepareLocalRule } from './smaug-client';

vi.mock('@carrot-fndn/shared/http-request', () => ({
  httpRequest: vi.fn(),
}));
vi.mock('@carrot-fndn/shared/aws-http', () => ({
  provideSmaugApiCredentials: vi.fn(),
}));

const mockHttpRequest = httpRequest as vi.MockedFunction<typeof httpRequest>;
const mockProvideSmaugApiCredentials = vi.mocked(provideSmaugApiCredentials);

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
  const localRequest = {
    dataSetName: 'TEST' as const,
    documentId: 'mass-id-456',
    input: {
      relatedDocuments: [{ category: 'WASTE' }],
    },
    ruleSlug: 'document-manifest-data',
    rulesScope: 'MassID' as const,
  };
  const localResponse = {
    auditDocumentId: 'audit-123',
    auditedDocumentId: 'mass-id-456',
    executionId: 'dry-run/uuid-789',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prepare a local rule with Smaug assumed credentials', async () => {
    const credentials = vi.fn();

    mockProvideSmaugApiCredentials.mockReturnValue(credentials);
    mockHttpRequest.mockResolvedValue({ data: localResponse } as never);

    await expect(prepareLocalRule(smaugUrl, localRequest)).resolves.toEqual(
      localResponse,
    );

    expect(mockHttpRequest).toHaveBeenCalledWith(
      {
        data: localRequest,
        method: 'POST',
        url: `${smaugUrl}/methodologies/dry-run/prepare-local-rule`,
      },
      { credentials },
    );
  });

  it('should reject a missing local preparation response', async () => {
    mockProvideSmaugApiCredentials.mockReturnValue(vi.fn());
    mockHttpRequest.mockResolvedValue(null as never);

    await expect(prepareLocalRule(smaugUrl, localRequest)).rejects.toThrow(
      'Smaug local rule preparation failed (HTTP N/A)',
    );
  });

  it('should reject a 4xx local preparation response without its body', async () => {
    mockProvideSmaugApiCredentials.mockReturnValue(vi.fn());
    mockHttpRequest.mockResolvedValue({
      data: { authorization: 'signed-header' },
      status: 400,
    } as never);

    await expect(prepareLocalRule(smaugUrl, localRequest)).rejects.toThrow(
      'Smaug local rule preparation failed (HTTP 400)',
    );
  });

  it('should call Smaug dry-run prepare endpoint', async () => {
    mockHttpRequest.mockResolvedValue({ data: mockResponse } as never);

    const result = await prepareDryRun(smaugUrl, {
      documentId: 'mass-id-456',
      methodologySlug: 'bold-carbon-organic',
      rulesScope: 'MassID',
    });

    expect(mockHttpRequest).toHaveBeenCalledWith({
      data: {
        documentId: 'mass-id-456',
        methodologySlug: 'bold-carbon-organic',
        rulesScope: 'MassID',
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
      rulesScope: 'MassID',
    });

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ruleSlug: 'document-manifest-data',
        }),
      }),
    );
  });

  it('should throw on 4xx error response with error body', async () => {
    mockHttpRequest.mockResolvedValue({
      data: { error: 'Bad Request', message: 'Invalid scope' },
      status: 400,
    } as never);

    await expect(
      prepareDryRun(smaugUrl, {
        documentId: 'mass-id-456',
        methodologySlug: 'bold-carbon-organic',
        rulesScope: 'INVALID',
      }),
    ).rejects.toThrow('Smaug dry-run prepare failed (HTTP 400)');
  });

  it('should throw when response is null', async () => {
    mockHttpRequest.mockResolvedValue(null as never);

    await expect(
      prepareDryRun(smaugUrl, {
        documentId: 'mass-id-456',
        methodologySlug: 'bold-carbon-organic',
        rulesScope: 'MassID',
      }),
    ).rejects.toThrow('Smaug dry-run prepare failed');
  });
});
