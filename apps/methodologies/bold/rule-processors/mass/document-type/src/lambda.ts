import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DocumentTypeProcessor } from './lib/document-type.processor';

const instance = new DocumentTypeProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
