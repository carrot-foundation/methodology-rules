import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassDocumentTypeProcessor } from './lib/mass-document-type.processor';

const instance = new MassDocumentTypeProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
