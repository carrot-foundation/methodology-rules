import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { HaulerIdentificationProcessor } from './hauler-identification.processor';

const instance = new HaulerIdentificationProcessor();

export const haulerIdentificationLambda = wrapRuleIntoLambdaHandler(instance);
