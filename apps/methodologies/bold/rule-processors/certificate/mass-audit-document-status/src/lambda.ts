import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassAuditDocumentStatusProcessor } from './lib/mass-audit-document-status.processor';

const instance = new MassAuditDocumentStatusProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
