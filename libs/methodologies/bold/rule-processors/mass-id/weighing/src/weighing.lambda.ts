import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { WeighingProcessor } from './weighing.processor';

const instance = new WeighingProcessor();

export const weighingLambda = wrapRuleIntoLambdaHandler(instance);
