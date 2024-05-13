import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CdfAttachmentNameProcessor } from './lib/cdf-attachment-name.processor';

const instance = new CdfAttachmentNameProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
