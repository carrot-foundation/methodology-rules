import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { NetWeightVerificationProcessor } from './lib/net-weight-verification.processor';

const instance = new NetWeightVerificationProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
