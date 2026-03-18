import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { STSClient } from '@aws-sdk/client-sts';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { getSentryDsn } from '@carrot-fndn/shared/env';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  stubContext,
  stubRuleInput,
  stubRuleOutput,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import * as Sentry from '@sentry/serverless';

import { wrapRuleIntoLambdaHandler } from './lambda-wrapper';

jest.mock('@carrot-fndn/shared/env', () => ({
  getArtifactChecksum: () => 'test-checksum',
  getAuditUrl: () => 'https://test.example.com',
  getAwsRegion: () => 'us-east-1',
  getDocumentBucketName: () => 'test-bucket',
  getEnvironment: () => 'development',
  getNodeEnv: () => 'test',
  getOptionalEnv: jest.fn(),
  getSentryDsn: jest.fn(() => undefined),
  getSmaugApiGatewayAssumeRoleArn: () => 'arn:aws:iam::123456:role/test',
  getSourceCodeUrl: () => 'https://test.example.com/repo',
  getSourceCodeVersion: () => 'test-version',
}));

process.env = {
  ...process.env,
  AWS_ACCESS_KEY_ID: faker.string.uuid(),
  AWS_REGION: 'us-east-1',
  AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
  SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: 'arn:aws:iam::123456:role/test',
};

describe('wrapRuleIntoLambdaHandler', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  jest.spyOn(Sentry.AWSLambda, 'init').mockImplementation();

  const mockStsAndFetch = () => {
    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response());
  };

  it('should work', async () => {
    const response = {
      ...stubRuleOutput(),
      resultStatus: RuleOutputStatus.PASSED,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({ ...response });
      }
    }

    mockStsAndFetch();

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());
    const result = await wrapper(stubRuleInput(), stubContext(), () => {});

    expect(result).toEqual(response);
  });

  it('should convert REVIEW_REQUIRED to FAILED before reporting and returning', async () => {
    const response = {
      ...stubRuleOutput(),
      resultStatus: RuleOutputStatus.REVIEW_REQUIRED,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({ ...response });
      }
    }

    mockStsAndFetch();

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());
    const result = await wrapper(stubRuleInput(), stubContext(), () => {});

    expect(result).toEqual({
      ...response,
      resultStatus: RuleOutputStatus.FAILED,
    });
  });

  it('should call setRuleSentryTags correctly', async () => {
    class Wrapped extends RuleDataProcessor {
      process(): Promise<RuleOutput> {
        throw new Error('Just a controlled test error.');
      }
    }

    const setTagsSpy = jest.spyOn(Sentry, 'setTags');

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());

    const ruleEvent = stubRuleInput();

    const lambdaContext = stubContext();

    await expect(wrapper(ruleEvent, lambdaContext, () => {})).rejects.toThrow(
      'Just a controlled test error.',
    );

    expect(setTagsSpy).toHaveBeenCalledWith({
      documentId: ruleEvent.documentId,
      documentKeyPrefix: ruleEvent.documentKeyPrefix,
      requestId: ruleEvent.requestId,
      ruleName: ruleEvent.ruleName,
    });
  });

  it('should pass the Sentry DSN when getSentryDsn returns a value', async () => {
    const sentryDsn = faker.internet.url();

    jest.mocked(getSentryDsn).mockReturnValueOnce(sentryDsn);

    const initSpy = jest.spyOn(Sentry.AWSLambda, 'init').mockImplementation();

    const response = {
      ...stubRuleOutput(),
      resultStatus: RuleOutputStatus.PASSED,
    };

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({ ...response });
      }
    }

    mockStsAndFetch();

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());
    const result = await wrapper(stubRuleInput(), stubContext(), () => {});

    expect(result).toEqual(response);
    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: sentryDsn }),
    );
  });
});
