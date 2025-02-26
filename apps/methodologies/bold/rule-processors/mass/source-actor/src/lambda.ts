import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { SourceActorProcessor } from './lib/source-actor.processor';

const instance = new SourceActorProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
