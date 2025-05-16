import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ProcessorIdentificationProcessor } from './processor-identification.processor';

const instance = new ProcessorIdentificationProcessor();

export const processorIdentificationLambda =
  wrapRuleIntoLambdaHandler(instance);
