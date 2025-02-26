import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { NumericWeightValuesProcessor } from './lib/numeric-weight-values.processor';

const instance = new NumericWeightValuesProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
