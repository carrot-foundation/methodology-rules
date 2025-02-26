import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DropOffGeolocationPrecisionProcessor } from './lib/drop-off-geolocation-precision.processor';

const instance = new DropOffGeolocationPrecisionProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
