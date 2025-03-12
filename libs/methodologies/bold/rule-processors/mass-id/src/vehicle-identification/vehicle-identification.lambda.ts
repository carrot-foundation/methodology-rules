import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { VehicleIdentificationProcessor } from './vehicle-identification.processor';

const instance = new VehicleIdentificationProcessor();

export const vehicleIdentificationLambda = wrapRuleIntoLambdaHandler(instance);
