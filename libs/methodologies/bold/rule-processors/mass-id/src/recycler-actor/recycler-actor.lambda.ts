import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RecyclerActorProcessor } from './recycler-actor.processor';

const instance = new RecyclerActorProcessor();

export const recyclerActorLambda = wrapRuleIntoLambdaHandler(instance);
