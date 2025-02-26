import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { VehicleLicensePlateProcessor } from './lib/vehicle-license-plate.processor';

const instance = new VehicleLicensePlateProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
