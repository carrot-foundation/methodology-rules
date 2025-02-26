import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MoveTypeProcessor } from './lib/move-type.processor';

const instance = new MoveTypeProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
