import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RecyclerActorDocumentProcessor } from './lib/recycler-actor.processor';

const instance = new RecyclerActorDocumentProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
