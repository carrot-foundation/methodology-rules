import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassAuditDocumentStatusProcessor } from './lib/mass-audit-document-status.processor';

const instance = new MassAuditDocumentStatusProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
