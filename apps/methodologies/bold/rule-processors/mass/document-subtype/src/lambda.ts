import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DocumentSubtypeProcessor } from './lib/document-subtype.processor';

const instance = new DocumentSubtypeProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
