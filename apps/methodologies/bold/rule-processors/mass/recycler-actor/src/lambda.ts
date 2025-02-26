import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RecyclerActorProcessor } from './lib/recycler-actor.processor';

const instance = new RecyclerActorProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
