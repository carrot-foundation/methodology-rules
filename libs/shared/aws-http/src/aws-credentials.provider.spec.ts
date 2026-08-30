import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { provideSmaugApiCredentials } from './aws-credentials.provider';

vi.mock('@aws-sdk/credential-providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aws-sdk/credential-providers')>()),
  fromTemporaryCredentials: vi.fn(),
}));

describe('provideSmaugApiCredentials', () => {
  const environment = { ...process.env };
  const trackedRoleArn = 'arn:aws:iam::629216831935:role/aws-api-gateway-role';
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

  it('should accept the tracked default API Gateway role ARN', () => {
    const trackedEnvironment = dotenv.parse(
      readFileSync(
        path.resolve(process.cwd(), '../../../.env-files/.env.test'),
        'utf8',
      ),
    );

    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] =
      trackedEnvironment['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'];

    expect(() => provideSmaugApiCredentials()).not.toThrow();
    expect(mockFromTemporaryCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ RoleArn: trackedRoleArn }),
      }),
    );
  });

  it('should return and invoke the cached provider for the same role ARN', async () => {
    const cachedRoleArn =
      'arn:aws:iam::123456789012:role/smaug-api-gateway-cache';
    const credentials = vi.fn().mockResolvedValue({
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-access-key',
    });

    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = cachedRoleArn;
    mockFromTemporaryCredentials.mockReturnValue(credentials);

    const firstProvider = provideSmaugApiCredentials();
    const secondProvider = provideSmaugApiCredentials();

    expect(firstProvider).toBe(credentials);
    expect(secondProvider).toBe(firstProvider);
    expect(mockFromTemporaryCredentials).toHaveBeenCalledTimes(1);

    await firstProvider();

    expect(credentials).toHaveBeenCalledTimes(1);
  });

  it('should create a provider for a changed valid role ARN', () => {
    const firstRoleArn =
      'arn:aws:iam::123456789012:role/smaug-api-gateway-first';
    const secondRoleArn =
      'arn:aws:iam::123456789012:role/smaug-api-gateway-second';
    const firstCredentials = vi.fn();
    const secondCredentials = vi.fn();

    mockFromTemporaryCredentials
      .mockReturnValueOnce(firstCredentials)
      .mockReturnValueOnce(secondCredentials);
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = firstRoleArn;

    const firstProvider = provideSmaugApiCredentials();

    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'] = secondRoleArn;
    const secondProvider = provideSmaugApiCredentials();

    expect(firstProvider).toBe(firstCredentials);
    expect(secondProvider).toBe(secondCredentials);
    expect(firstProvider).not.toBe(secondProvider);
    expect(mockFromTemporaryCredentials).toHaveBeenCalledTimes(2);
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
