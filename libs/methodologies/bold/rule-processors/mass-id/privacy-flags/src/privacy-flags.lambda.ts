import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { PrivacyFlagsProcessor } from './privacy-flags.processor';

const instance = new PrivacyFlagsProcessor();

export const privacyFlagsLambda = wrapRuleIntoLambdaHandler(instance);
