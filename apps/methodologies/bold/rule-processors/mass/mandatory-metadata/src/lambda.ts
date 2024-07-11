import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MandatoryMetadataProcessor } from './lib/mandatory-metadata.processor';

const instance = new MandatoryMetadataProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
