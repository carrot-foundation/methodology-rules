import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { EventValueProcessor } from './lib/event-value.processor';

const instance = new EventValueProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
