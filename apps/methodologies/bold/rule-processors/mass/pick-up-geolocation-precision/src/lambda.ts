import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { PickUpGeolocationPrecisionProcessor } from './lib/pick-up-geolocation-precision.processor';

const instance = new PickUpGeolocationPrecisionProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
