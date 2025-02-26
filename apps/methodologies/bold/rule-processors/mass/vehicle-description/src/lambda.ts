import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { VehicleDescriptionProcessor } from './lib/vehicle-description.processor';

const instance = new VehicleDescriptionProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
