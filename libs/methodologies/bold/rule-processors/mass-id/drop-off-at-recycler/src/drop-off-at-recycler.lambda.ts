import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DropOffAtRecyclerProcessor } from './drop-off-at-recycler.processor';

const instance = new DropOffAtRecyclerProcessor();

export const dropOffAtRecyclerLambda = wrapRuleIntoLambdaHandler(instance);
