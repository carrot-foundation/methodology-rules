import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DocumentValueProcessor } from './lib/document-value.processor';

const instance = new DocumentValueProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
