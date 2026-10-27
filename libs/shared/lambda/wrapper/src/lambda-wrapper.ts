import type { MethodologyRuleEvent } from '@carrot-fndn/shared/lambda/types';
import type { RuleInput, RuleOutput } from '@carrot-fndn/shared/rule/types';
import type { Context, Handler } from 'aws-lambda';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import {
  getEnvironment,
  getNodeEnv,
  getSentryDsn,
} from '@carrot-fndn/shared/env';
import { logger } from '@carrot-fndn/shared/helpers';
import { reportRuleResults } from '@carrot-fndn/shared/rule/result';
import { RuleInputSchema } from '@carrot-fndn/shared/rule/types';
import { AWSLambda, setTags } from '@sentry/serverless';
import { randomUUID } from 'node:crypto';

const mapEventToRuleInput = (event: MethodologyRuleEvent): RuleInput =>
  RuleInputSchema.parse(event);

const mapRuleOutputToLambdaResult = (ruleOutput: RuleOutput): unknown =>
  ruleOutput;

// TODO: remove once Smaug supports REVIEW_REQUIRED
const toUpstreamCompatibleOutput = (ruleOutput: RuleOutput): RuleOutput =>
  ruleOutput.resultStatus === 'REVIEW_REQUIRED'
    ? { ...ruleOutput, resultStatus: 'FAILED' }
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

  const sentryDsn = getSentryDsn();
  const isProduction = getNodeEnv() === 'production';

  if (isProduction && !sentryDsn) {
    logger.warn('SENTRY_DSN is not set — error monitoring is disabled');
  }

  AWSLambda.init({
    ...(sentryDsn ? { dsn: sentryDsn } : {}),
    enabled: isProduction,
    environment: getEnvironment(),
  });

  const handler = async (
    event: MethodologyRuleEvent,
    context: Context,
  ): Promise<unknown> => {
    try {
      const ruleInput = mapEventToRuleInput(event);

      logger.info(
        {
          documentId: ruleInput.documentId,
          requestId: ruleInput.requestId,
          ruleName: ruleInput.ruleName,
        },
        'Rule invoked',
      );

      const attemptId = randomUUID();
      const startedAt = new Date().toISOString();
      const evaluatedOutput = await rule.process(ruleInput);
      const finishedAt = new Date().toISOString();
      const ruleOutput: RuleOutput = {
        ...toUpstreamCompatibleOutput(evaluatedOutput),
        timing: { attemptId, finishedAt, startedAt },
      };

      await reportRuleResults(ruleOutput, context);

      return mapRuleOutputToLambdaResult(ruleOutput);
    } catch (error) {
      setRuleSentryTags(event);
      throw error;
    }
  };

  return AWSLambda.wrapHandler(handler);
};
