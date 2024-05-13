import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassValidationDocumentStatusProcessor } from './lib/mass-validation-document-status.processor';

const instance = new MassValidationDocumentStatusProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
