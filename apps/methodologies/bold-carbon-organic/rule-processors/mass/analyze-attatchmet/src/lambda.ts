import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MTRAttatchmentProcessor } from './lib/analyze-attatchment.processor';

const instance = new MTRAttatchmentProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
