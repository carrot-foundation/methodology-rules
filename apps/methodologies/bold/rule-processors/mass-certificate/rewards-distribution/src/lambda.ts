import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RewardsDistributionProcessor } from './lib';

const instance = new RewardsDistributionProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
