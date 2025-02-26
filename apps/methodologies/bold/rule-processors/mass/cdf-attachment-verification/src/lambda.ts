import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfAttachmentVerificationProcessor } from './lib/cdf-attachment-verification.processor';

const instance = new CdfAttachmentVerificationProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
