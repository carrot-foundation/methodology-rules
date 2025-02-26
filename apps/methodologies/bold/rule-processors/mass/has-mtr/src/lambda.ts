import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { HasMtrProcessor } from './lib/has-mtr.processor';

const instance = new HasMtrProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
