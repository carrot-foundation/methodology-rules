import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { SameRecyclerAndDropOffAddressesProcessor } from './lib/same-recycler-and-drop-off-addresses.processor';

const instance = new SameRecyclerAndDropOffAddressesProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
