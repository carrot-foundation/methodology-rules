import type { StringObject } from '@carrot-fndn/shared/types';

import { STSClient } from '@aws-sdk/client-sts';
import { fromContainerMetadata } from '@aws-sdk/credential-providers';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { signRequest, type SignRequestInput } from './aws-http.service.helpers';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('@aws-sdk/credential-providers', () => ({
  ...jest.requireActual('@aws-sdk/credential-providers'),
  fromContainerMetadata: jest.fn(),
}));

describe('signRequest', () => {
  const environment = { ...process.env };
  const mockFromContainerMetadata = fromContainerMetadata as jest.Mock;

  beforeEach(() => {
    process.env = {
      ...environment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
    };

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);
  });

  afterEach(() => {
    process.env = environment;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it.each([undefined, null, ''])('should omit the body if %s', async (body) => {
    const input: SignRequestInput = {
      ...random<SignRequestInput>(),
      body,
    };

    const result = await signRequest(input, faker.string.uuid());

    expect(result.body).not.toBeDefined();
  });

  it('should return http request object with authorization header, body and query', async () => {
    const input: SignRequestInput = {
      ...random<SignRequestInput>(),
      body: random<StringObject>(),
      query: random<StringObject>(),
    };

    const result = await signRequest(input, faker.string.uuid());

    expect(result).toMatchObject({
      body: JSON.stringify(input.body),
      headers: expect.objectContaining({
        authorization: expect.any(String),
        Host: input.url.host,
      }),
      query: input.query,
    });
  });

  it.each(['development', 'production'])(
    'should return http request object with authorization header for %s',
    async (nodeEnvironment) => {
      const input = random<SignRequestInput>();

      const awsExecutionEnvironment =
        nodeEnvironment === 'production'
          ? { AWS_EXECUTION_ENV: 'AWS_ECS' }
          : {};

      mockFromContainerMetadata.mockReturnValue({
        accessKeyId: faker.string.uuid(),
        secretAccessKey: faker.string.uuid(),
        sessionToken: faker.string.uuid(),
      });

      process.env = {
        AWS_ACCESS_KEY_ID: faker.string.uuid(), // required by "fromEnv()"
        AWS_SECRET_ACCESS_KEY: faker.string.uuid(), // required by "fromEnv()"
        NODE_ENV: nodeEnvironment,
        ...awsExecutionEnvironment,
      };

      const result = await signRequest(input, faker.string.uuid());

      expect(result).toMatchObject({
        headers: expect.objectContaining({
          authorization: expect.any(String),
          Host: input.url.host,
        }),
      });
    },
  );
});
