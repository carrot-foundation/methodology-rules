import type { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';

import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RewardsDistributionProcessor } from './rewards-distribution.processor';

export const rewardsDistributionLambda = (
  certificateMatch: DocumentMatcher,
) => {
  const instance = new RewardsDistributionProcessor(certificateMatch);

  return wrapRuleIntoLambdaHandler(instance);
};
