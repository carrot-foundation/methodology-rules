import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MtrAttachmentNameProcessor } from './lib/mtr-attachment-name.processor';

const instance = new MtrAttachmentNameProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
