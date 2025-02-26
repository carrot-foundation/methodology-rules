import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { HasCdfProcessor } from './lib/has-cdf.processor';

const instance = new HasCdfProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
