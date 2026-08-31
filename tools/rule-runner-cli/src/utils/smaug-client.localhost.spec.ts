import axios from 'axios';

const { mockFromTemporaryCredentials, mockSignRequest } = vi.hoisted(() => ({
  mockFromTemporaryCredentials: vi.fn(),
  mockSignRequest: vi.fn(),
}));

vi.mock('axios');
vi.mock('@aws-sdk/credential-providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aws-sdk/credential-providers')>()),
  fromTemporaryCredentials: mockFromTemporaryCredentials,
}));
vi.mock('@carrot-fndn/shared/aws-http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@carrot-fndn/shared/aws-http')>()),
  signRequest: mockSignRequest,
}));

const awsEnvironmentKeys = [
  'AWS_ACCESS_KEY_ID',
  'AWS_CONTAINER_CREDENTIALS_FULL_URI',
  'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
  'AWS_DEFAULT_PROFILE',
  'AWS_PROFILE',
  'AWS_ROLE_ARN',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
  'SMAUG_API_GATEWAY_ASSUME_ROLE_ARN',
] as const;
const originalEnvironment = { ...process.env };
const mockedAxios = vi.mocked(axios);

describe('prepareLocalRule localhost boundary', () => {
  beforeEach(() => {
    process.env = { ...originalEnvironment };

    for (const key of awsEnvironmentKeys) {
      delete process.env[key];
    }
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('should bypass credential resolution and signing without AWS configuration', async () => {
    const response = {
      auditDocumentId: 'audit-123',
      auditedDocumentId: 'mass-id-456',
      executionId: 'dry-run/uuid-789',
    };

    mockedAxios.mockResolvedValue({ data: response, status: 200 });

    const { prepareLocalRule } = await import('./smaug-client');

    await expect(
      prepareLocalRule('http://localhost:3000', {
        dataSetName: 'TEST',
        documentId: 'mass-id-456',
        ruleSlug: 'document-manifest-data',
        rulesScope: 'MassID',
      }),
    ).resolves.toEqual(response);

    expect(mockFromTemporaryCredentials).not.toHaveBeenCalled();
    expect(mockSignRequest).not.toHaveBeenCalled();
    expect(mockedAxios).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3000',
      data: {
        dataSetName: 'TEST',
        documentId: 'mass-id-456',
        ruleSlug: 'document-manifest-data',
        rulesScope: 'MassID',
      },
      method: 'POST',
      url: '/methodologies/dry-run/prepare-local-rule',
    });
  });
});
