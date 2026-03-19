import { STSClient } from '@aws-sdk/client-sts';
import { fromContainerMetadata } from '@aws-sdk/credential-providers';
import { faker } from '@faker-js/faker';

import { signRequest, type SignRequestInput } from './aws-http.service.helpers';

const stubSignRequestInput = (): SignRequestInput => ({
  method: faker.internet.httpMethod(),
  url: new URL(faker.internet.url()),
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
vi.mock('@aws-sdk/credential-providers', () => ({
  ...vi.importActual('@aws-sdk/credential-providers'),
  fromContainerMetadata: vi.fn(),
}));

describe('signRequest', () => {
  const environment = { ...process.env };
  const mockFromContainerMetadata = fromContainerMetadata as vi.Mock;

  beforeEach(() => {
    process.env = {
      ...environment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
    };

    vi.spyOn(STSClient.prototype, 'send').mockResolvedValue({
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
    vi.restoreAllMocks();
  });

  it.each([undefined, null, ''])('should omit the body if %s', async (body) => {
    const input: SignRequestInput = {
      ...stubSignRequestInput(),
      body,
    };

    const result = await signRequest(input, faker.string.uuid());

    expect(result.body).not.toBeDefined();
  });

  it('should return http request object with authorization header, body and query', async () => {
    const input: SignRequestInput = {
      ...stubSignRequestInput(),
      body: { [faker.string.sample()]: faker.string.sample() },
      query: { [faker.string.sample()]: faker.string.sample() },
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
      const input = stubSignRequestInput();

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
