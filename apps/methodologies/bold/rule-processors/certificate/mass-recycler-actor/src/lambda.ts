import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RecyclerActorDocumentProcessor } from './lib/recycler-actor.processor';

const instance = new RecyclerActorDocumentProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
