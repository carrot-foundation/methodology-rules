import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DropOffGeolocationPrecisionProcessor } from './lib/drop-off-geolocation-precision.processor';

const instance = new DropOffGeolocationPrecisionProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
