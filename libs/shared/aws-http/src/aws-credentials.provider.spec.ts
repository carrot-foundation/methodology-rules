import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { faker } from '@faker-js/faker';

import { provideSmaugApiCredentials } from './aws-credentials.provider';

vi.mock('@aws-sdk/credential-providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aws-sdk/credential-providers')>()),
  fromTemporaryCredentials: vi.fn(),
}));

describe('provideSmaugApiCredentials', () => {
  const environment = { ...process.env };
  const validRoleArn = 'arn:aws:iam::123456789012:role/smaug-api-gateway';
  const mockFromTemporaryCredentials = vi.mocked(fromTemporaryCredentials);

  beforeEach(() => {
    process.env = {
      ...environment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: 'us-east-1',
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: validRoleArn,
    };
    mockFromTemporaryCredentials.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    process.env = environment;
    vi.clearAllMocks();
  });

  it('should configure the configured API Gateway role from base credentials', () => {
    provideSmaugApiCredentials();

    expect(mockFromTemporaryCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        clientConfig: {},
        masterCredentials: expect.any(Function),
        params: {
          RoleArn: validRoleArn,
          RoleSessionName: 'methodology-rules-smaug-api',
        },
      }),
    );
  });

  it.each([
    undefined,
    'arn:aws:iam::1234:role/aws-api-gateway-role',
    'invalid',
  ])('should reject unusable role ARN %s before signing', (roleArn) => {
    if (roleArn === undefined) {
      delete process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'];
    } else {
      process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = roleArn;
    }

    expect(() => provideSmaugApiCredentials()).toThrow();
    expect(mockFromTemporaryCredentials).not.toHaveBeenCalled();
  });
});
