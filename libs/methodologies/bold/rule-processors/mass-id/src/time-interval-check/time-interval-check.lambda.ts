import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { TimeIntervalCheckProcessor } from './time-interval-check.processor';

const instance = new TimeIntervalCheckProcessor();

export const timeIntervalCheckLambda = wrapRuleIntoLambdaHandler(instance);
