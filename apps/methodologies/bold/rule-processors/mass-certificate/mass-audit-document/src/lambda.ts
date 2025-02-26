import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassAuditDocumentProcessor } from './lib/mass-audit-document.processor';

const instance = new MassAuditDocumentProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
