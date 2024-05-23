import type { MethodologyRuleEvent } from '@carrot-fndn/shared/lambda/types';
import type { RuleOutput } from '@carrot-fndn/shared/rule/types';
import type { Context } from 'aws-lambda';

import { STSClient } from '@aws-sdk/client-sts';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { faker } from '@faker-js/faker';
import * as Sentry from '@sentry/serverless';
import { random } from 'typia';

import { wrapRuleIntoLambdaHandler } from './lambda-wrapper';

process.env = {
  ...process.env,
  AWS_ACCESS_KEY_ID: faker.string.uuid(),
  AWS_REGION: faker.string.uuid(),
  AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
  SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: faker.string.uuid(),
};

describe('wrapRuleIntoLambdaHandler', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  jest.spyOn(Sentry.AWSLambda, 'init').mockImplementation();

  it('should work', async () => {
    const response = random<RuleOutput>();

    class Wrapped extends RuleDataProcessor {
      process() {
        return Promise.resolve({
          ...response,
        });
      }
    }

    jest.spyOn(STSClient.prototype, 'send').mockResolvedValue({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    } as never);

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response());

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());

    const ruleEvent = random<MethodologyRuleEvent>();

    const lambdaContext = random<Context>();

    const result = await wrapper(ruleEvent, lambdaContext, () => {});

    expect(result).toEqual(response);
  });

  it('should call setRuleSentryTags correctly', async () => {
    class Wrapped extends RuleDataProcessor {
      process(): Promise<RuleOutput> {
        throw new Error('Just a controlled test error.');
      }
    }

    const setTagsSpy = jest.spyOn(Sentry, 'setTags');

    const wrapper = wrapRuleIntoLambdaHandler(new Wrapped());

    const ruleEvent = random<MethodologyRuleEvent>();

    const lambdaContext = random<Context>();

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
});
