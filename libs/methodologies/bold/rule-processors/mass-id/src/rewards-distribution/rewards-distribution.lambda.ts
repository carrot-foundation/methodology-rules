import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RewardsDistributionProcessor } from './rewards-distribution.processor';

const instance = new RewardsDistributionProcessor();

export const rewardsDistributionLambda = wrapRuleIntoLambdaHandler(instance);
