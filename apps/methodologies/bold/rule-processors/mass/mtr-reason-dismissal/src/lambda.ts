import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MtrReasonDismissalProcessor } from './lib/mtr-reason-dismissal.processor';

const instance = new MtrReasonDismissalProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
