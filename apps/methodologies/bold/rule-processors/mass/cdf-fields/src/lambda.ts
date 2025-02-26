import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfFieldsProcessor } from './lib/cdf-fields.processor';

const instance = new CdfFieldsProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
