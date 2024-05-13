import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MtrReasonDismissalProcessor } from './lib/mtr-reason-dismissal.processor';

const instance = new MtrReasonDismissalProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
