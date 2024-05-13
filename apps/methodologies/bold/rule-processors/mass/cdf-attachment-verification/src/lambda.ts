import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfAttachmentVerificationProcessor } from './lib/cdf-attachment-verification.processor';

const instance = new CdfAttachmentVerificationProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
