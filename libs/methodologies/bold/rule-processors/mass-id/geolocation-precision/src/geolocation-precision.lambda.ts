import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { GeolocationPrecisionProcessor } from './geolocation-precision.processor';

const instance = new GeolocationPrecisionProcessor();

export const geolocationPrecisionLambda = wrapRuleIntoLambdaHandler(instance);
