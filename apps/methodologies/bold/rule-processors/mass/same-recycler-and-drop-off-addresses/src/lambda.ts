import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { SameRecyclerAndDropOffAddressesProcessor } from './lib/same-recycler-and-drop-off-addresses.processor';

const instance = new SameRecyclerAndDropOffAddressesProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
