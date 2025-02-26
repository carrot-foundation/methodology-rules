import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfReasonDismissalProcessor } from './lib/cdf-reason-dismissal.processor';

const instance = new CdfReasonDismissalProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
