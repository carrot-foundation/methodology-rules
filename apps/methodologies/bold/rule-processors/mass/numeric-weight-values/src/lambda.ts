import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { NumericWeightValuesProcessor } from './lib/numeric-weight-values.processor';

const instance = new NumericWeightValuesProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
