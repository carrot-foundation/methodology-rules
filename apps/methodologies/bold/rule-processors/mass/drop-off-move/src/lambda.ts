import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DropOffMoveProcessor } from './lib/drop-off-move.processor';

const instance = new DropOffMoveProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
