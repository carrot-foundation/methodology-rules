import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DocumentMeasurementUnitProcessor } from './lib/document-measurement-unit.processor';

const instance = new DocumentMeasurementUnitProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
