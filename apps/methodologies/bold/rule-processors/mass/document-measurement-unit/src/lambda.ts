import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DocumentMeasurementUnitProcessor } from './lib/document-measurement-unit.processor';

const instance = new DocumentMeasurementUnitProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
