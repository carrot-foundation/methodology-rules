import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RegionalWasteClassificationProcessor } from './regional-waste-classification.processor';

const instance = new RegionalWasteClassificationProcessor();

export const regionalWasteClassificationLambda =
  wrapRuleIntoLambdaHandler(instance);
