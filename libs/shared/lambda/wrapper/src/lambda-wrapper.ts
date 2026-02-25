import type { MethodologyRuleEvent } from '@carrot-fndn/shared/lambda/types';
import type { RuleInput, RuleOutput } from '@carrot-fndn/shared/rule/types';
import type { Handler } from 'aws-lambda';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { logger } from '@carrot-fndn/shared/helpers';
import { reportRuleResults } from '@carrot-fndn/shared/rule/result';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { AWSLambda, setTags } from '@sentry/serverless';

const mapEventToRuleInput = (event: MethodologyRuleEvent): RuleInput => ({
  ...event,
});

const mapRuleOutputToLambdaResult = (ruleOutput: RuleOutput): unknown =>
  ruleOutput;

// TODO: remove once Smaug supports REVIEW_REQUIRED
const toUpstreamCompatibleOutput = (ruleOutput: RuleOutput): RuleOutput =>
  ruleOutput.resultStatus === RuleOutputStatus.REVIEW_REQUIRED
    ? { ...ruleOutput, resultStatus: RuleOutputStatus.FAILED }
    : ruleOutput;

const setRuleSentryTags = ({
  documentId,
  documentKeyPrefix,
  requestId,
  ruleName,
}: RuleInput) => {
  setTags({
    documentId,
    documentKeyPrefix,
    requestId,
    ruleName,
  });
};

export const wrapRuleIntoLambdaHandler = (
  rule: RuleDataProcessor,
): Handler<MethodologyRuleEvent, unknown> => {
  // Prevent MaxListenersExceededWarning by increasing the limit
  // This addresses the issue with multiple uncaughtException listeners added by Sentry
  process.setMaxListeners(20);

  AWSLambda.init({
    dsn: String(process.env['SENTRY_DSN']),
    enabled: String(process.env['NODE_ENV']) === 'production',
    environment: String(process.env['ENVIRONMENT']),
  });

  const handler = async (event: MethodologyRuleEvent): Promise<unknown> => {
    const ruleInput = mapEventToRuleInput(event);

    logger.info({ ruleInput }, 'Rule invoked');

    try {
      const ruleOutput = toUpstreamCompatibleOutput(
        await rule.process(ruleInput),
      );

      await reportRuleResults(ruleOutput);

      return mapRuleOutputToLambdaResult(ruleOutput);
    } catch (error) {
      setRuleSentryTags(ruleInput);
      throw error;
    }
  };

  return AWSLambda.wrapHandler(handler);
};
