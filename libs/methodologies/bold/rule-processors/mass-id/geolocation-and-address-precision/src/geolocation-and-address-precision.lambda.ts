import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { GeolocationAndAddressPrecisionProcessor } from './geolocation-and-address-precision.processor';

const instance = new GeolocationAndAddressPrecisionProcessor();

export const geolocationAndAddressPrecisionLambda =
  wrapRuleIntoLambdaHandler(instance);
