import type {
  MethodologyRuleEvent,
  MethodologyRuleResponse,
} from '@carrot-fndn/shared/lambda/types';
import type { RuleInput, RuleOutput } from '@carrot-fndn/shared/rule/types';
import type { Handler } from 'aws-lambda';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { logger } from '@carrot-fndn/shared/helpers';
import { reportRuleResults } from '@carrot-fndn/shared/rule/result';
import { AWSLambda, setTags } from '@sentry/serverless';

const mapEventToRuleInput = (event: MethodologyRuleEvent): RuleInput => ({
  ...event,
});

const mapRuleOutputToLambdaResult = (
  ruleOutput: RuleOutput,
): MethodologyRuleResponse => ruleOutput;

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
): Handler<MethodologyRuleEvent, MethodologyRuleResponse> => {
  AWSLambda.init({
    dsn: String(process.env['SENTRY_DSN']),
    enabled: String(process.env['NODE_ENV']) === 'production',
    environment: String(process.env['ENVIRONMENT']),
  });

  // eslint-disable-next-line no-console
  console.log('Temporary log');

  const handler = async (
    event: MethodologyRuleEvent,
  ): Promise<MethodologyRuleResponse> => {
    const ruleInput = mapEventToRuleInput(event);

    logger.info({ ruleInput }, 'Rule invoked');

    try {
      const ruleOutput = await rule.process(ruleInput);

      await reportRuleResults(ruleOutput);

      return mapRuleOutputToLambdaResult(ruleOutput);
    } catch (error) {
      setRuleSentryTags(ruleInput);
      throw error;
    }
  };

  return AWSLambda.wrapHandler(handler);
};
