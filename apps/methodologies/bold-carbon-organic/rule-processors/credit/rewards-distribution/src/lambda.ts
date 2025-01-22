import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RewardsDistributionProcessor } from './lib/rewards-distribution.processor';

const instance = new RewardsDistributionProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
