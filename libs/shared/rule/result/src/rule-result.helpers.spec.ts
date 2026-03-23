import { STSClient } from '@aws-sdk/client-sts';
import { logger } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  stubEnumValue,
  stubRuleInput,
  stubRuleOutput,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  mapRuleOutputToPostProcessInput,
  mapToRuleOutput,
  reportRuleResults,
  signRequest,
} from './rule-result.helpers';

const mockArtifactChecksum = vi.fn(() => faker.string.uuid());
const mockSourceCodeUrl = vi.fn(() => faker.internet.url());
const mockSourceCodeVersion = vi.fn(() => faker.string.uuid());
const mockSmaugArn = vi.fn(() => faker.string.uuid());
const mockAwsRegion = vi.fn(() => faker.string.uuid());

vi.mock('@carrot-fndn/shared/env', () => ({
  getArtifactChecksum: () => mockArtifactChecksum(),
  getAwsRegion: () => mockAwsRegion(),
  getOptionalEnv: vi.fn(),
  getSmaugApiGatewayAssumeRoleArn: () => mockSmaugArn(),
  getSourceCodeUrl: () => mockSourceCodeUrl(),
  getSourceCodeVersion: () => mockSourceCodeVersion(),
}));

describe('mapToRuleOutput', () => {
  it('should map to RuleOutput without resultComment or resultContent', () => {
    const ruleInput = stubRuleInput();
    const resultStatus = stubEnumValue(RuleOutputStatus);

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
    const ruleInput = stubRuleInput();
    const resultStatus = stubEnumValue(RuleOutputStatus);
    const resultComment = faker.string.sample();
    const resultContent = { [faker.string.sample()]: faker.string.sample() };

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
  let artifactChecksum: string;
  let sourceCodeUrl: string;
  let sourceCodeVersion: string;

  beforeEach(() => {
    artifactChecksum = faker.string.uuid();
    sourceCodeUrl = faker.internet.url();
    sourceCodeVersion = faker.string.uuid();
    mockArtifactChecksum.mockReturnValue(artifactChecksum);
    mockSourceCodeUrl.mockReturnValue(sourceCodeUrl);
    mockSourceCodeVersion.mockReturnValue(sourceCodeVersion);
  });

  it('should return comment', () => {
    const resultComment = faker.lorem.sentence();
    const result = mapRuleOutputToPostProcessInput({
      ...stubRuleOutput(),
      resultComment,
    });

    expect(result.output.comment).toBe(resultComment);
  });

  it('should not return comment if undefined', () => {
    const result = mapRuleOutputToPostProcessInput({
      requestId: faker.string.uuid(),
      responseToken: faker.string.uuid(),
      responseUrl: faker.internet.url(),
      resultContent: undefined,
      resultStatus: stubEnumValue(RuleOutputStatus),
    });

    expect(result.output.comment).not.toBeDefined();
  });
});

describe('reportRuleResults', () => {
  const originalEnvironment = { ...process.env };
  let artifactChecksum: string;
  let sourceCodeUrl: string;
  let sourceCodeVersion: string;

  beforeEach(() => {
    const awsRegion = faker.string.uuid();
    const smaugArn = faker.string.uuid();

    artifactChecksum = faker.string.uuid();
    sourceCodeUrl = faker.internet.url();
    sourceCodeVersion = faker.string.uuid();

    mockArtifactChecksum.mockReturnValue(artifactChecksum);
    mockSourceCodeUrl.mockReturnValue(sourceCodeUrl);
    mockSourceCodeVersion.mockReturnValue(sourceCodeVersion);
    mockSmaugArn.mockReturnValue(smaugArn);
    mockAwsRegion.mockReturnValue(awsRegion);

    process.env = {
      ...originalEnvironment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: awsRegion,
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: smaugArn,
    };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it('should send a request to the given responseUrl', async () => {
    const ruleOutput = {
      ...stubRuleOutput(),
      responseUrl: faker.internet.url(),
      resultContent: { [faker.string.sample()]: faker.string.sample() },
    };

    vi.spyOn(STSClient.prototype, 'send').mockResolvedValue({
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

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response());

    await expect(reportRuleResults(ruleOutput)).resolves.not.toThrow();

    expect(fetch).toHaveBeenCalledWith(ruleOutput.responseUrl, {
      ...request,
      body: JSON.stringify({
        output: {
          artifactChecksum,
          comment: ruleOutput.resultComment,
          content: ruleOutput.resultContent,
          sourceCodeUrl,
          sourceCodeVersion,
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
    const ruleOutput = {
      ...stubRuleOutput(),
      responseUrl: 'not a valid url',
    };

    await expect(reportRuleResults(ruleOutput)).rejects.toBeDefined();
  });

  it('should throw error when response code is not ok', async () => {
    const ruleOutput = {
      ...stubRuleOutput(),
      responseUrl: faker.internet.url(),
      resultContent: { [faker.string.sample()]: faker.string.sample() },
    };

    vi.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 400 }),
    );

    await expect(reportRuleResults(ruleOutput)).rejects.toBeDefined();

    expect(fetch).toHaveBeenCalled();
  });

  it('should throw error when the request throws error', async () => {
    const ruleOutput = {
      ...stubRuleOutput(),
      responseUrl: faker.internet.url(),
      resultContent: { [faker.string.sample()]: faker.string.sample() },
    };

    const errorResponse = new Response();

    vi.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(errorResponse);
    vi.spyOn(logger, 'error').mockImplementationOnce(() => {});

    await expect(reportRuleResults(ruleOutput)).rejects.toBe(errorResponse);

    expect(logger.error).toHaveBeenCalledWith(
      expect.anything(),
      'Failed to report rule results',
    );

    expect(fetch).toHaveBeenCalled();
  });
});

describe('signRequest', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    const awsRegion = faker.string.uuid();
    const smaugArn = faker.string.uuid();

    mockSmaugArn.mockReturnValue(smaugArn);
    mockAwsRegion.mockReturnValue(awsRegion);

    process.env = {
      ...originalEnvironment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: awsRegion,
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: smaugArn,
    };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it('should return http request object with authorization header', async () => {
    const input = {
      body: { [faker.string.sample()]: faker.string.sample() },
      method: faker.internet.httpMethod(),
      query: { [faker.string.sample()]: faker.string.sample() },
      url: new URL(faker.internet.url()),
    };

    vi.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    const result = await signRequest(input);

    expect(result).toEqual(
      expect.objectContaining({
        body: JSON.stringify(input.body),
        headers: expect.objectContaining({
          authorization: expect.any(String),
          'Content-Type': 'application/json',
          Host: input.url.host,
        }),
        hostname: input.url.hostname,
        method: input.method,
        password: undefined,
        path: input.url.pathname,
        port: undefined,
        protocol: 'https:',
        query: input.query,
        username: undefined,
      }),
    );
  });

  it('should throw error when Credentials for the assumed role are not found', async () => {
    const input = {
      body: { [faker.string.sample()]: faker.string.sample() },
      method: faker.internet.httpMethod(),
      query: { [faker.string.sample()]: faker.string.sample() },
      url: new URL(faker.internet.url()),
    };

    vi.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: undefined,
    } as never);

    await expect(signRequest(input)).rejects.toThrow();
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
    const input = {
      body: { [faker.string.sample()]: faker.string.sample() },
      method: faker.internet.httpMethod(),
      query: { [faker.string.sample()]: faker.string.sample() },
      url: new URL(faker.internet.url()),
    };

    vi.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials,
    } as never);

    await expect(signRequest(input)).rejects.toThrow();
  });
});
