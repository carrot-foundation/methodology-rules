import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MtrAttachmentVerificationProcessor } from './lib/mtr-attachment-verification.processor';

const instance = new MtrAttachmentVerificationProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
