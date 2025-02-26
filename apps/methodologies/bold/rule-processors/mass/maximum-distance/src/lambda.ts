import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MaximumDistanceProcessor } from './lib/maximum-distance.processor';

const instance = new MaximumDistanceProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
