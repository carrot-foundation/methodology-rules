import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { SameSourceAndPickUpAddressesProcessor } from './lib/same-source-and-pick-up-addresses.processor';

const instance = new SameSourceAndPickUpAddressesProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
