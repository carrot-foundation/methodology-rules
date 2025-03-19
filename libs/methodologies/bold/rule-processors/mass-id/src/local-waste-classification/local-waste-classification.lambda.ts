import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { LocalWasteClassificationProcessor } from './local-waste-classification.processor';

const instance = new LocalWasteClassificationProcessor();

export const localWasteClassificationLambda =
  wrapRuleIntoLambdaHandler(instance);
