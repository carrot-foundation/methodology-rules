import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { NetWeightVerificationProcessor } from './lib/net-weight-verification.processor';

const instance = new NetWeightVerificationProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
