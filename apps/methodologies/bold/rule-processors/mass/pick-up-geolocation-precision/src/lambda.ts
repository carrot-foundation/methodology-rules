import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { PickUpGeolocationPrecisionProcessor } from './lib/pick-up-geolocation-precision.processor';

const instance = new PickUpGeolocationPrecisionProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
