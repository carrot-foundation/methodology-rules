import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfAddressProcessor } from './lib/cdf-address.processor';

const instance = new CdfAddressProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
