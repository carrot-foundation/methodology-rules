import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { InvoiceFieldsProcessor } from './lib/invoice-fields.processor';

const instance = new InvoiceFieldsProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
