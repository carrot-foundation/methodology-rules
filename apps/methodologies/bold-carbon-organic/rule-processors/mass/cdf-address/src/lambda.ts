import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfAddressProcessor } from './lib/cdf-address.processor';

const instance = new CdfAddressProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
