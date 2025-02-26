import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MandatoryMetadataProcessor } from './lib/mandatory-metadata.processor';

const instance = new MandatoryMetadataProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
