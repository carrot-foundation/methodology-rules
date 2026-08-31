import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { faker } from '@faker-js/faker';

import {
  type AwsCredentialIdentityProvider,
  provideSmaugApiCredentials,
} from './aws-credentials.provider';

vi.mock('@aws-sdk/credential-providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aws-sdk/credential-providers')>()),
  fromTemporaryCredentials: vi.fn(),
}));

describe('provideSmaugApiCredentials', () => {
  const environment = { ...process.env };
  const stubRoleArn = (roleName: string): string =>
    `arn:aws:iam::${faker.string.numeric(12)}:role/${roleName}`;
  const validRoleArn = stubRoleArn('smaug-api-gateway');
  const concurrentRoleArn = stubRoleArn('smaug-api-gateway-concurrent');
  const sequentialRoleArn = stubRoleArn('smaug-api-gateway-sequential');
  const expiringRoleArn = stubRoleArn('smaug-api-gateway-expiring');
  const rejectedRefreshRoleArn = stubRoleArn(
    'smaug-api-gateway-rejected-refresh',
  );
  const credentials = {
    accessKeyId: faker.string.uuid(),
    secretAccessKey: faker.string.uuid(),
  };
  const refreshedCredentials = {
    accessKeyId: faker.string.uuid(),
    secretAccessKey: faker.string.uuid(),
  };
  const assumeRoleProvider = vi.fn<AwsCredentialIdentityProvider>();
  const mockFromTemporaryCredentials = vi.mocked(fromTemporaryCredentials);

  beforeEach(() => {
    process.env = {
      ...environment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: 'us-east-1',
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: validRoleArn,
    };
    assumeRoleProvider.mockResolvedValue(credentials);
    mockFromTemporaryCredentials.mockReturnValue(assumeRoleProvider);
  });

  afterEach(() => {
    process.env = environment;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should configure the API Gateway role lazily from base credentials', async () => {
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = validRoleArn;

    const provider = provideSmaugApiCredentials();

    expect(mockFromTemporaryCredentials).not.toHaveBeenCalled();

    await provider();

    expect(mockFromTemporaryCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
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
  ])('should reject unusable role ARN %s before signing', async (roleArn) => {
    if (roleArn === undefined) {
      delete process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'];
    } else {
      process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = roleArn;
    }

    await expect(provideSmaugApiCredentials()()).rejects.toThrow();
    expect(mockFromTemporaryCredentials).not.toHaveBeenCalled();
  });

  it('should coalesce concurrent resolution and reuse unexpired credentials', async () => {
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = concurrentRoleArn;
    const provider = provideSmaugApiCredentials();

    const [first, second] = await Promise.all([provider(), provider()]);

    expect(first).toBe(second);
    expect(assumeRoleProvider).toHaveBeenCalledTimes(1);
  });

  it('should reuse unexpired credentials across sequential resolutions', async () => {
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = sequentialRoleArn;
    const provider = provideSmaugApiCredentials();

    await provider();
    await provider();

    expect(assumeRoleProvider).toHaveBeenCalledTimes(1);
  });

  it('should coalesce refresh within five minutes of expiration', async () => {
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = expiringRoleArn;
    vi.useFakeTimers();
    vi.setSystemTime('2026-08-30T12:00:00.000Z');
    assumeRoleProvider.mockResolvedValue({
      ...credentials,
      expiration: new Date('2026-08-30T13:00:00.000Z'),
    });
    const provider = provideSmaugApiCredentials();

    await provider();
    vi.setSystemTime('2026-08-30T12:56:00.000Z');
    await Promise.all([provider(), provider()]);

    expect(assumeRoleProvider).toHaveBeenCalledTimes(2);
  });

  it('should retry after a rejected refresh', async () => {
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = rejectedRefreshRoleArn;
    vi.useFakeTimers();
    vi.setSystemTime('2026-08-30T12:00:00.000Z');
    assumeRoleProvider
      .mockResolvedValueOnce({
        ...credentials,
        expiration: new Date('2026-08-30T13:00:00.000Z'),
      })
      .mockRejectedValueOnce(new Error('STS unavailable'))
      .mockResolvedValueOnce(refreshedCredentials);
    const provider = provideSmaugApiCredentials();

    await provider();
    vi.setSystemTime('2026-08-30T12:56:00.000Z');
    await expect(provider()).rejects.toThrow('STS unavailable');
    await expect(provider()).resolves.toEqual(refreshedCredentials);

    expect(assumeRoleProvider).toHaveBeenCalledTimes(3);
  });
});
