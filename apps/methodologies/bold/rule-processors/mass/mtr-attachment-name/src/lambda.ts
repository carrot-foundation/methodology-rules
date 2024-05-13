import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MtrAttachmentNameProcessor } from './lib/mtr-attachment-name.processor';

const instance = new MtrAttachmentNameProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
