import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { SameSourceAndPickUpAddressesProcessor } from './lib/same-source-and-pick-up-addresses.processor';

const instance = new SameSourceAndPickUpAddressesProcessor();

// eslint-disable-next-line no-console
console.log('Temporary Log');

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
