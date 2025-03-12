import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { WasteOriginIdentificationProcessor } from './waste-origin-identification.processor';

const instance = new WasteOriginIdentificationProcessor();

export const wasteOriginIdentificationLambda =
  wrapRuleIntoLambdaHandler(instance);
