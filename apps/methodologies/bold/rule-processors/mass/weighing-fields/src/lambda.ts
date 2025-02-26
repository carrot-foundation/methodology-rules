import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { WeighingFieldsProcessor } from './lib/weighing-fields.processor';

const instance = new WeighingFieldsProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
