import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfAttachmentNameProcessor } from './lib/cdf-attachment-name.processor';

const instance = new CdfAttachmentNameProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
