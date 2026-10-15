import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { getSentryDsn } from '@carrot-fndn/shared/env';
import { logger } from '@carrot-fndn/shared/helpers';
import { RuleOutputSchema } from '@carrot-fndn/shared/rule/types';
import {
  stubContext,
  stubRuleInput,
  stubRuleOutput,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import * as Sentry from '@sentry/serverless';

import { wrapRuleIntoLambdaHandler } from './lambda-wrapper';

const mockGetNodeEnv = vi.fn(() => 'test');
const provideStubSmaugCredentials = () =>
  Promise.resolve({
    accessKeyId: 'smaug-access-key',
    secretAccessKey: 'smaug-secret-key',
    sessionToken: 'smaug-session-token',
  });

vi.mock('@carrot-fndn/shared/env', () => ({
  getArtifactChecksum: () => 'test-checksum',
  getAuditUrl: () => 'https://test.example.com',
  getAwsRegion: () => 'us-east-1',
  getDocumentBucketName: () => 'test-bucket',
  getEnvironment: () => 'development',
  getNodeEnv: () => mockGetNodeEnv(),
  getSentryDsn: vi.fn(() => undefined),
  getSmaugApiGatewayAssumeRoleArn: () =>
    'arn:aws:iam::123456789012:role/carrot-test-smaug-api-gateway',
  getSourceCodeUrl: () => 'https://test.example.com/repo',
  getSourceCodeVersion: () => 'test-version',
}));

vi.mock('@carrot-fndn/shared/aws-http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@carrot-fndn/shared/aws-http')>()),
  provideSmaugApiCredentials: vi.fn(() => provideStubSmaugCredentials),
}));

process.env = {
  ...process.env,
  AWS_ACCESS_KEY_ID: faker.string.uuid(),
  AWS_REGION: 'us-east-1',
  AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
  SMAUG_API_GATEWAY_ASSUME_ROLE_ARN:
    'arn:aws:iam::123456789012:role/carrot-test-smaug-api-gateway',
};

describe('wrapRuleIntoLambdaHandler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  vi.spyOn(Sentry.AWSLambda, 'init').mockImplementation(() => {});

  const mockFetch = () =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response());

  it('should work', async () => {
    const response = {
      ...stubRuleOutput(),
      resultContent: { [faker.string.sample()]: faker.string.sample() },
      resultStatus: 'PASSED' as const,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({ ...response });
      }
    }

    const fetchSpy = mockFetch();

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());
    const result = await wrapper(stubRuleInput(), stubContext(), () => {});

    expect(result).toMatchObject(response);
    expect(fetchSpy).toHaveBeenCalledWith(
      response.responseUrl,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-amz-security-token': 'smaug-session-token',
        }),
        method: 'POST',
      }),
    );
  });

  it('should convert REVIEW_REQUIRED to FAILED before reporting and returning', async () => {
    const response = {
      ...stubRuleOutput(),
      resultContent: { [faker.string.sample()]: faker.string.sample() },
      resultStatus: 'REVIEW_REQUIRED' as const,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({ ...response });
      }
    }

    mockFetch();

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());
    const result = await wrapper(stubRuleInput(), stubContext(), () => {});

    expect(result).toMatchObject({
      ...response,
      resultStatus: 'FAILED' as const,
    });
  });

  it('should call setRuleSentryTags correctly', async () => {
    class Wrapped extends RuleDataProcessor {
      process(): Promise<RuleOutput> {
        throw new Error('Just a controlled test error.');
      }
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setTagsSpy = vi.spyOn(Sentry, 'setTags');

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());

    const ruleEvent = stubRuleInput();

    const lambdaContext = stubContext();

    await expect(wrapper(ruleEvent, lambdaContext, () => {})).rejects.toThrow(
      'Just a controlled test error.',
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setTagsSpy).toHaveBeenCalledWith({
      documentId: ruleEvent.documentId,
      documentKeyPrefix: ruleEvent.documentKeyPrefix,
      requestId: ruleEvent.requestId,
      ruleName: ruleEvent.ruleName,
    });
  });

  it('should log a warning when SENTRY_DSN is missing in production', async () => {
    mockGetNodeEnv.mockReturnValueOnce('production');

    const warnSpy = vi.spyOn(logger, 'warn');

    const response = {
      ...stubRuleOutput(),
      resultContent: { [faker.string.sample()]: faker.string.sample() },
      resultStatus: 'PASSED' as const,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({ ...response });
      }
    }

    mockFetch();

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());

    await wrapper(stubRuleInput(), stubContext(), () => {});

    expect(warnSpy).toHaveBeenCalledWith(
      'SENTRY_DSN is not set — error monitoring is disabled',
    );

    warnSpy.mockRestore();
  });

  it('should throw when event fails schema validation', async () => {
    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve(stubRuleOutput());
      }
    }

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());

    const invalidEvent = {
      ...stubRuleInput(),
      responseUrl: 'not-a-url',
    };

    await expect(
      wrapper(invalidEvent, stubContext(), () => {}),
    ).rejects.toThrow();
  });

  it('should pass the Sentry DSN when getSentryDsn returns a value', async () => {
    const sentryDsn = faker.internet.url();

    vi.mocked(getSentryDsn).mockReturnValueOnce(sentryDsn);

    const initSpy = vi
      .spyOn(Sentry.AWSLambda, 'init')
      .mockImplementation(() => {});

    const response = {
      ...stubRuleOutput(),
      resultContent: { [faker.string.sample()]: faker.string.sample() },
      resultStatus: 'PASSED' as const,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({ ...response });
      }
    }

    mockFetch();

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());
    const result = await wrapper(stubRuleInput(), stubContext(), () => {});

    expect(result).toMatchObject(response);
    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: sentryDsn }),
    );
  });

  it('should measure evaluation before waiting for callback delivery and omit response tokens from logs', async () => {
    const startedAt = faker.date.recent().toISOString();
    const finishedAt = new Date(Date.parse(startedAt) + 75).toISOString();
    const deliveredAt = new Date(Date.parse(startedAt) + 10_000).toISOString();
    const response = {
      ...stubRuleOutput({ resultContent: {} }),
      resultStatus: 'PASSED' as const,
    };
    const input = stubRuleInput({ responseToken: faker.string.uuid() });
    const infoSpy = vi
      .spyOn(logger, 'info')
      .mockImplementation(() => undefined);

    class Wrapped extends RuleDataProcessor {
      process() {
        vi.setSystemTime(new Date(finishedAt));

        return Promise.resolve(response);
      }
    }

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => {
        vi.setSystemTime(new Date(deliveredAt));

        return Promise.resolve(new Response());
      });

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(startedAt));
    const result = await wrapRuleIntoLambdaHandler(new Wrapped())(
      input,
      stubContext(),
      () => {},
    );

    expect(result).toMatchObject({ timing: { finishedAt, startedAt } });
    const request = fetchSpy.mock.calls[0]?.[1];

    if (typeof request?.body !== 'string') {
      throw new TypeError('Callback fixture expects a serialized body');
    }
    expect(JSON.parse(request.body)).toMatchObject({
      output: { timing: { finishedAt, startedAt } },
    });
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(
      input.responseToken,
    );
    expect(infoSpy).toHaveBeenCalledWith(
      {
        documentId: input.documentId,
        requestId: input.requestId,
        ruleName: input.ruleName,
      },
      'Rule invoked',
    );
  });

  it('should refuse a backwards measured clock before callback delivery', async () => {
    const startedAt = faker.date.recent().toISOString();
    const response = stubRuleOutput({ resultContent: {} });

    class Wrapped extends RuleDataProcessor {
      process() {
        vi.setSystemTime(new Date(Date.parse(startedAt) - 1));

        return Promise.resolve(response);
      }
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(startedAt));

    await expect(
      wrapRuleIntoLambdaHandler(new Wrapped())(
        stubRuleInput(),
        stubContext(),
        () => {},
      ),
    ).rejects.toThrow('Rule completion must not precede its start');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should generate a distinct attempt for every retry after callback failure', async () => {
    const response = {
      ...stubRuleOutput({ resultContent: {} }),
      resultStatus: 'PASSED' as const,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve(response);
      }
    }

    const failure = new Error('Synthetic callback outage');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(new Response());
    const handler = wrapRuleIntoLambdaHandler(new Wrapped());
    const input = stubRuleInput();

    await expect(handler(input, stubContext(), () => {})).rejects.toBe(failure);
    const result = RuleOutputSchema.parse(
      await handler(input, stubContext(), () => {}),
    );
    const firstBody = fetchSpy.mock.calls[0]?.[1]?.body;

    if (typeof firstBody !== 'string') {
      throw new TypeError('Callback fixture expects a serialized body');
    }
    expect(result).toHaveProperty('timing.attemptId');
    expect(firstBody).not.toContain(
      result.timing?.attemptId ?? 'missing-timing',
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
