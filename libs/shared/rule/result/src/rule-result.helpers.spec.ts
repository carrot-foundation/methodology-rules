import { logger } from '@carrot-fndn/shared/helpers';
import {
  RuleFindingSchema,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  createStubFromSchema,
  stubEnumValue,
  stubRuleInput,
  stubRuleOutput,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { randomInt } from 'node:crypto';

import {
  mapRuleOutputToPostProcessInput,
  mapToRuleOutput,
  reportRuleResults,
  signRequest,
} from './rule-result.helpers';

const mockArtifactChecksum = vi.fn(() => faker.string.uuid());
const mockSourceCodeUrl = vi.fn(() => faker.internet.url());
const mockSourceCodeVersion = vi.fn(() => faker.string.uuid());
const mockAwsRegion = vi.fn(() => faker.string.uuid());
const validSmaugRoleArn = 'arn:aws:iam::123456789012:role/smaug-api-gateway';
const provideStubSmaugCredentials = () =>
  Promise.resolve({
    accessKeyId: 'smaug-access-key',
    secretAccessKey: 'smaug-secret-key',
    sessionToken: 'smaug-session-token',
  });

vi.mock('@carrot-fndn/shared/env', () => ({
  getArtifactChecksum: () => mockArtifactChecksum(),
  getAwsRegion: () => mockAwsRegion(),
  getOptionalEnv: vi.fn(),
  getSourceCodeUrl: () => mockSourceCodeUrl(),
  getSourceCodeVersion: () => mockSourceCodeVersion(),
}));

vi.mock('@carrot-fndn/shared/aws-http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@carrot-fndn/shared/aws-http')>()),
  provideSmaugApiCredentials: vi.fn(() => provideStubSmaugCredentials),
}));

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();

  return { ...actual, randomInt: vi.fn(actual.randomInt) };
});

const stubReportableRuleOutput = () => ({
  ...stubRuleOutput(),
  responseUrl: faker.internet.url(),
  resultContent: { [faker.string.sample()]: faker.string.sample() },
});

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

  it.each(['FAILED', 'REVIEW_REQUIRED'] as const)(
    'should merge the findings beside the result content of a %s result',
    (resultStatus) => {
      const resultContent = { [faker.string.alpha(8)]: faker.string.sample() };
      const resultFindings = [createStubFromSchema(RuleFindingSchema)];

      const result = mapToRuleOutput(stubRuleInput(), resultStatus, {
        resultContent,
        resultFindings,
      });

      expect(result.resultContent).toEqual({
        ...resultContent,
        findings: resultFindings,
      });
    },
  );

  it('should hold only the findings when a FAILED result has no result content', () => {
    const resultFindings = [createStubFromSchema(RuleFindingSchema)];

    const result = mapToRuleOutput(stubRuleInput(), 'FAILED', {
      resultFindings,
    });

    expect(result.resultContent).toEqual({ findings: resultFindings });
  });

  it('should not add findings to a PASSED result', () => {
    const ruleInput = stubRuleInput();
    const resultContent = { [faker.string.alpha(8)]: faker.string.sample() };

    const result = mapToRuleOutput(ruleInput, 'PASSED', {
      resultContent,
      resultFindings: [createStubFromSchema(RuleFindingSchema)],
    });

    expect(result).toStrictEqual({
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: undefined,
      resultContent,
      resultStatus: 'PASSED',
    });
  });

  it.each([
    { resultFindings: undefined, resultStatus: 'FAILED' as const },
    { resultFindings: [], resultStatus: 'FAILED' as const },
    { resultFindings: undefined, resultStatus: 'REVIEW_REQUIRED' as const },
    { resultFindings: [], resultStatus: 'REVIEW_REQUIRED' as const },
  ])(
    'should keep a $resultStatus result unchanged and log an error when the findings are $resultFindings',
    ({ resultFindings, resultStatus }) => {
      const ruleInput = stubRuleInput();

      const result = mapToRuleOutput(ruleInput, resultStatus, {
        resultFindings,
      });

      expect(result).toStrictEqual({
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment: undefined,
        resultContent: undefined,
        resultStatus,
      });
      expect(logger.error).toHaveBeenCalledWith(
        {
          requestId: ruleInput.requestId,
          resultStatus,
          ruleName: ruleInput.ruleName,
        },
        'Non-passing rule result has no findings',
      );
    },
  );

  it.each([
    { resultFindings: undefined, resultStatus: 'PASSED' as const },
    {
      resultFindings: [createStubFromSchema(RuleFindingSchema)],
      resultStatus: 'FAILED' as const,
    },
  ])(
    'should not log an error for a $resultStatus result that follows the findings contract',
    ({ resultFindings, resultStatus }) => {
      mapToRuleOutput(stubRuleInput(), resultStatus, { resultFindings });

      expect(logger.error).not.toHaveBeenCalled();
    },
  );
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

  it('should keep the findings of the result content exactly', () => {
    const resultContent = {
      [faker.string.alpha(8)]: faker.string.sample(),
      findings: [createStubFromSchema(RuleFindingSchema)],
    };

    const result = mapRuleOutputToPostProcessInput({
      ...stubRuleOutput(),
      resultContent,
    });

    expect(result.output.content).toStrictEqual(resultContent);
  });

  it('should preserve measured timing through JSON callback projection', () => {
    const startedAt = faker.date.recent().toISOString();
    const timing = {
      attemptId: faker.string.uuid(),
      finishedAt: new Date(Date.parse(startedAt) + 30).toISOString(),
      startedAt,
    };
    const result = mapRuleOutputToPostProcessInput({
      ...stubRuleOutput(),
      resultContent: {},
      timing,
    });

    const serialized = JSON.stringify(result);

    expect(JSON.parse(serialized)).toMatchObject({
      output: { timing },
    });
  });

  it('should keep legacy callbacks without timing or fabricated clocks', () => {
    const result = mapRuleOutputToPostProcessInput({
      requestId: faker.string.uuid(),
      responseToken: faker.string.uuid(),
      responseUrl: faker.internet.url(),
      resultStatus: 'PASSED',
    });

    expect(result.output).not.toHaveProperty('timing');
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
  const ampleTime = { getRemainingTimeInMillis: () => 60_000 };
  let artifactChecksum: string;
  let sourceCodeUrl: string;
  let sourceCodeVersion: string;

  beforeEach(() => {
    const awsRegion = faker.string.uuid();

    artifactChecksum = faker.string.uuid();
    sourceCodeUrl = faker.internet.url();
    sourceCodeVersion = faker.string.uuid();

    mockArtifactChecksum.mockReturnValue(artifactChecksum);
    mockSourceCodeUrl.mockReturnValue(sourceCodeUrl);
    mockSourceCodeVersion.mockReturnValue(sourceCodeVersion);
    mockAwsRegion.mockReturnValue(awsRegion);

    process.env = {
      ...originalEnvironment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: awsRegion,
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: validSmaugRoleArn,
    };
  });

  afterEach(() => {
    process.env = originalEnvironment;
    vi.useRealTimers();
  });

  it('should send a request to the given responseUrl', async () => {
    vi.useFakeTimers();
    vi.setSystemTime('2026-08-30T12:00:00.000Z');
    const ruleOutput = stubReportableRuleOutput();

    const { headers, ...request } = await signRequest({
      body: mapRuleOutputToPostProcessInput(ruleOutput),
      method: 'POST',
      url: new URL(ruleOutput.responseUrl),
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response());

    await expect(
      reportRuleResults(ruleOutput, ampleTime),
    ).resolves.not.toThrow();

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

    await expect(
      reportRuleResults(ruleOutput, ampleTime),
    ).rejects.toBeDefined();
  });

  it('should exclude a failed response body from errors and logs', async () => {
    const responseSecret = 'fictional-secret-response-body';
    const ruleOutput = stubReportableRuleOutput();
    const loggerErrorSpy = vi
      .spyOn(logger, 'error')
      .mockImplementation(() => undefined);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(responseSecret, { status: 400 }),
    );

    let error: unknown;

    try {
      await reportRuleResults(ruleOutput, ampleTime);
    } catch (caughtError: unknown) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(Error);

    const errorMessage = error instanceof Error ? error.message : '';

    expect(errorMessage).toBe('Failed to report rule results: status 400');
    expect(errorMessage).not.toContain(responseSecret);
    expect(JSON.stringify(loggerErrorSpy.mock.calls)).not.toContain(
      responseSecret,
    );

    const loggedError = loggerErrorSpy.mock.calls[0]?.[0];

    expect(loggedError).toBeInstanceOf(Error);

    const loggedErrorMessage =
      loggedError instanceof Error ? loggedError.message : '';

    expect(loggedErrorMessage).not.toContain(responseSecret);

    expect(fetch).toHaveBeenCalled();
  });

  it('should throw error when the request throws error', async () => {
    const ruleOutput = stubReportableRuleOutput();

    const errorResponse = new Response();

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(errorResponse);
    vi.spyOn(logger, 'error').mockImplementationOnce(() => {});

    await expect(reportRuleResults(ruleOutput, ampleTime)).rejects.toBe(
      errorResponse,
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.anything(),
      'Failed to report rule results',
    );

    expect(fetch).toHaveBeenCalled();
  });

  it('should not retry when signing the request fails', async () => {
    vi.spyOn(globalThis, 'fetch');
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    await expect(
      reportRuleResults(
        {
          ...stubReportableRuleOutput(),
          responseUrl: 'http://callback.example.com/post-process',
        },
        ampleTime,
      ),
    ).rejects.toThrow('Signed requests require HTTPS');
    expect(fetch).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  describe('when the report fails', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(logger, 'error').mockImplementation(() => undefined);
      vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    });

    it.each([408, 425, 429, 500, 502, 503, 504])(
      'should retry on %i and then succeed',
      async (status) => {
        const failedResponse = new Response('unavailable', { status });

        vi.spyOn(globalThis, 'fetch')
          .mockResolvedValueOnce(failedResponse)
          .mockResolvedValueOnce(new Response());

        const report = reportRuleResults(stubReportableRuleOutput(), ampleTime);

        await vi.runAllTimersAsync();

        await expect(report).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.objectContaining({ attempt: 1, status }),
          'Retrying rule results report',
        );
        expect(logger.error).not.toHaveBeenCalled();
        expect(failedResponse.bodyUsed).toBe(true);
      },
    );

    it('should retry on a network error and then succeed', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(new Response());

      const report = reportRuleResults(stubReportableRuleOutput(), ampleTime);

      await vi.runAllTimersAsync();

      await expect(report).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, err: expect.any(TypeError) }),
        'Retrying rule results report',
      );
    });

    it.each([400, 401, 403, 404])('should not retry on %i', async (status) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(undefined, { status }),
      );

      await expect(
        reportRuleResults(stubReportableRuleOutput(), ampleTime),
      ).rejects.toThrow(`Failed to report rule results: status ${status}`);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should give up after the attempt cap and throw the last error', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response(undefined, { status: 503 })),
      );

      const report = reportRuleResults(stubReportableRuleOutput(), ampleTime);

      await Promise.all([
        expect(report).rejects.toThrow(
          'Failed to report rule results: status 503',
        ),
        vi.runAllTimersAsync(),
      ]);

      expect(fetch).toHaveBeenCalledTimes(4);
      expect(logger.warn).toHaveBeenCalledTimes(3);

      for (const attempt of [1, 2, 3]) {
        expect(logger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            attempt,
            delayMs: expect.toSatisfy(
              (delayMs: number) => delayMs < 1000 * 2 ** (attempt - 1),
            ),
          }),
          'Retrying rule results report',
        );
      }

      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        expect.any(Error),
        'Failed to report rule results',
      );
    });

    it('should bound a retry so it fails before the Lambda deadline', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      const timeout = new DOMException(
        'The operation timed out',
        'TimeoutError',
      );
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
        .mockRejectedValueOnce(timeout);

      const report = reportRuleResults(stubReportableRuleOutput(), {
        getRemainingTimeInMillis: vi
          .fn()
          .mockReturnValueOnce(60_000)
          .mockReturnValue(20_000),
      });

      await Promise.all([
        expect(report).rejects.toBe(timeout),
        vi.runAllTimersAsync(),
      ]);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeUndefined();
      expect(fetchSpy.mock.calls[1]?.[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(timeoutSpy).toHaveBeenCalledWith(17_000);
      expect(logger.error).toHaveBeenCalledWith(
        timeout,
        'Failed to report rule results',
      );
    });

    it('should abort a retry at once when the deadline reserve is already spent', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
        .mockResolvedValueOnce(new Response());

      const report = reportRuleResults(stubReportableRuleOutput(), {
        getRemainingTimeInMillis: vi
          .fn()
          .mockReturnValueOnce(60_000)
          .mockReturnValue(1000),
      });

      await vi.runAllTimersAsync();
      await report;

      expect(timeoutSpy).toHaveBeenCalledWith(0);
    });

    it('should sign the request again on every attempt', async () => {
      const firstAttemptAt = Date.parse('2026-10-27T12:00:00.000Z');

      vi.setSystemTime(firstAttemptAt);
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementationOnce(() => {
          vi.setSystemTime(firstAttemptAt + 600_000);

          return Promise.resolve(new Response(undefined, { status: 503 }));
        })
        .mockResolvedValueOnce(new Response());

      const report = reportRuleResults(stubReportableRuleOutput(), ampleTime);

      await vi.runAllTimersAsync();
      await report;

      const [firstHeaders, secondHeaders] = fetchSpy.mock.calls.map(
        ([, request]) => new Headers(request?.headers),
      );

      expect(firstHeaders?.get('x-amz-date')).toBe('20261027T120000Z');
      expect(secondHeaders?.get('x-amz-date')).toBe('20261027T121000Z');
      expect(secondHeaders?.get('authorization')).not.toBe(
        firstHeaders?.get('authorization'),
      );
      expect(fetchSpy.mock.calls[1]?.[1]?.body).toBe(
        fetchSpy.mock.calls[0]?.[1]?.body,
      );
    });

    it('should stop retrying when the remaining time leaves no margin', async () => {
      const getRemainingTimeInMillis = vi
        .fn()
        .mockReturnValueOnce(60_000)
        .mockReturnValue(4999);

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(new Response(undefined, { status: 503 })),
      );

      const report = reportRuleResults(stubReportableRuleOutput(), {
        getRemainingTimeInMillis,
      });

      await Promise.all([
        expect(report).rejects.toThrow(
          'Failed to report rule results: status 503',
        ),
        vi.runAllTimersAsync(),
      ]);

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should count the backoff delay against the remaining time', async () => {
      vi.mocked(randomInt).mockImplementationOnce(() => 900);
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(undefined, { status: 503 }),
      );

      await expect(
        reportRuleResults(stubReportableRuleOutput(), {
          getRemainingTimeInMillis: () => 5800,
        }),
      ).rejects.toThrow('Failed to report rule results: status 503');
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('signRequest', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    const awsRegion = faker.string.uuid();

    mockAwsRegion.mockReturnValue(awsRegion);

    process.env = {
      ...originalEnvironment,
      AWS_ACCESS_KEY_ID: faker.string.uuid(),
      AWS_REGION: awsRegion,
      AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
      SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: validSmaugRoleArn,
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

    const result = await signRequest(input);

    expect(result).toEqual(
      expect.objectContaining({
        body: JSON.stringify(input.body),
        headers: expect.objectContaining({
          authorization: expect.any(String),
          'Content-Type': 'application/json',
          Host: input.url.host,
          'x-amz-security-token': 'smaug-session-token',
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
});
