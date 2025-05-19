import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DriverIdentificationProcessor } from './driver-identification.processor';

const instance = new DriverIdentificationProcessor();

export const driverIdentificationLambda = wrapRuleIntoLambdaHandler(instance);
