import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfReasonDismissalProcessor } from './lib/cdf-reason-dismissal.processor';

const instance = new CdfReasonDismissalProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
