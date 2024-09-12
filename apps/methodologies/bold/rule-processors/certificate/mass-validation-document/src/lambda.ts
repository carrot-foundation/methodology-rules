import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassAuditDocumentProcessor } from './lib/mass-validation-document.processor';

const instance = new MassAuditDocumentProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
