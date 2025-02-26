import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { VehicleTypeProcessor } from './lib/vehicle-type.processor';

const instance = new VehicleTypeProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
