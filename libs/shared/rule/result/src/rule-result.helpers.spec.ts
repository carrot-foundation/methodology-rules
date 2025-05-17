import type {
  RuleInput,
  RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { STSClient } from '@aws-sdk/client-sts';
import { logger } from '@carrot-fndn/shared/helpers';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import {
  mapRuleOutputToPostProcessInput,
  mapToRuleOutput,
  reportRuleResults,
  signRequest,
} from './rule-result.helpers';

type Query = Record<string, null | string | string[]>;

describe('mapToRuleOutput', () => {
  it('should map to RuleOutput without resultComment or resultContent', () => {
    const ruleInput = random<RuleInput>();
    const resultStatus = random<RuleOutputStatus>();

    const result = mapToRuleOutput(ruleInput, resultStatus);

    expect(result).toEqual({
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: undefined,
      resultContent: undefined,
      resultStatus,
    });
  });

  it('should map to RuleOutput with resultComment and resultContent', () => {
    const ruleInput = random<RuleInput>();
    const resultStatus = random<RuleOutputStatus>();
    const resultComment = random<string>();
    const resultContent = random<Record<string, string>>();

    const result = mapToRuleOutput(ruleInput, resultStatus, {
      resultComment,
      resultContent,
    });

    expect(result).toEqual({
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultContent,
      resultStatus,
    });
  });
});

describe('mapRuleOutputToPostProcessInput', () => {
  const environment = { ...process.env };

  beforeEach(() => {
    process.env = { ...environment };
  });

  afterEach(() => {
    process.env = environment;
  });

  it.each(['ARTIFACT_CHECKSUM', 'SOURCE_CODE_URL', 'SOURCE_CODE_VERSION'])(
    'should throw error when variable %s is not set',
    (variable) => {
      const ruleOutput = random<RuleOutput>();

      delete process.env[variable];

      expect(() => mapRuleOutputToPostProcessInput(ruleOutput)).toThrow(
        'createAssert',
      );
    },
  );

  it('should return comment', () => {
    const resultComment = faker.lorem.sentence();
    const result = mapRuleOutputToPostProcessInput({
      ...random<RuleOutput>(),
      resultComment,
    });

    expect(result.output.comment).toBe(resultComment);
  });

  it('should not return comment if undefined', () => {
    const result =
      mapRuleOutputToPostProcessInput(
        random<Omit<RuleOutput, 'resultComment'>>(),
      );

    expect(result.output.comment).not.toBeDefined();
  });
});

describe('reportRuleResults', () => {
  const environment = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...environment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: faker.string.uuid(),
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: faker.string.uuid(),
    };
  });

  afterEach(() => {
    process.env = environment;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should send a request to the given responseUrl', async () => {
    const ruleOutput = random<RuleOutput>();

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    const { headers, ...request } = await signRequest({
      body: mapRuleOutputToPostProcessInput(ruleOutput),
      method: 'POST',
      url: new URL(ruleOutput.responseUrl),
    });

    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response());

    await expect(reportRuleResults(ruleOutput)).resolves.not.toThrow();

    expect(fetch).toHaveBeenCalledWith(ruleOutput.responseUrl, {
      ...request,
      body: JSON.stringify({
        output: {
          artifactChecksum: process.env['ARTIFACT_CHECKSUM'],
          comment: ruleOutput.resultComment,
          content: ruleOutput.resultContent,
          sourceCodeUrl: process.env['SOURCE_CODE_URL'],
          sourceCodeVersion: process.env['SOURCE_CODE_VERSION'],
          status: ruleOutput.resultStatus,
        },
        taskToken: ruleOutput.responseToken,
      }),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      method: 'POST',
    });
  });

  it('should throw error when ruleOutput is not valid', async () => {
    const ruleOutput = random<RuleOutput>();

    ruleOutput.responseUrl = 'not a valid url';

    await expect(reportRuleResults(ruleOutput)).rejects.toBeDefined();
  });

  it('should throw error when response code is not ok', async () => {
    const ruleOutput = random<RuleOutput>();

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 400 }));

    await expect(reportRuleResults(ruleOutput)).rejects.toBeDefined();

    expect(fetch).toHaveBeenCalled();
  });

  it('should should throw error the request throws error', async () => {
    const ruleOutput = random<RuleOutput>();

    const errorResponse = new Response();

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(errorResponse);
    jest.spyOn(logger, 'error').mockImplementationOnce(() => {});

    await expect(reportRuleResults(ruleOutput)).rejects.toBe(errorResponse);

    expect(logger.error).toHaveBeenCalledWith(
      expect.anything(),
      'Failed to report rule results',
    );

    expect(fetch).toHaveBeenCalled();
  });
});

describe('signRequest', () => {
  const environment = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...environment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: faker.string.uuid(),
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: faker.string.uuid(),
    };
  });

  afterEach(() => {
    process.env = environment;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should return http request object with authorization header', async () => {
    const input = random<{
      body: unknown;
      method: string;
      query: Query;
      url: URL;
    }>();

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    const result = await signRequest(input);

    expect(result).toEqual({
      body: JSON.stringify(input.body),
      headers: expect.objectContaining({
        authorization: expect.any(String),
        'Content-Type': 'application/json',
        Host: input.url.host,
      }),
      hostname: input.url.hostname,
      method: input.method,
      password: undefined,
      path: `/${input.url.pathname}`,
      port: undefined,
      protocol: 'https:',
      query: input.query,
      username: undefined,
    });
  });

  it('should throw error when Credentials for the assumed role are not found', async () => {
    const input = random<{
      body: unknown;
      method: string;
      query: Query;
      url: URL;
    }>();

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: undefined,
    } as never);

    await expect(signRequest(input)).rejects.toThrow(
      'Error on createAssert(): invalid type on $input, expect to be Credentials',
    );
  });

  it.each([
    {
      Credentials: {
        AccessKeyId: undefined,
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
      field: 'AccessKeyId',
    },
    {
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: undefined,
        SessionToken: faker.string.uuid(),
      },
      field: 'SecretAccessKey',
    },
    {
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: undefined,
      },
      field: 'SessionToken',
    },
  ])('should throw error when $field is undefined', async ({ Credentials }) => {
    const input = random<{
      body: unknown;
      method: string;
      query: Query;
      url: URL;
    }>();

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials,
    } as never);

    await expect(signRequest(input)).rejects.toThrow(
      'Error on createAssert(): invalid type on $input, expect to be string',
    );
  });

  it.each(['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN', 'AWS_REGION'])(
    'should throw error when %s is not found',
    async (value) => {
      const input = random<{
        body: unknown;
        method: string;
        query: Query;
        url: URL;
      }>();

      delete process.env[value];

      await expect(signRequest(input)).rejects.toThrow(
        'Error on createAssert(): invalid type on $input, expect to be string',
      );
    },
  );
});
