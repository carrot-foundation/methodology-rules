import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MtrAttachmentVerificationProcessor } from './lib/mtr-attachment-verification.processor';

const instance = new MtrAttachmentVerificationProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
