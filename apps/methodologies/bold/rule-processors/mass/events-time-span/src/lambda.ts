import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { EventsTimeSpanProcessor } from './lib/events-time-span.processor';

const instance = new EventsTimeSpanProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
