import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { WasteMassIsUniqueProcessor } from './waste-mass-is-unique.processor';

const instance = new WasteMassIsUniqueProcessor();

export const wasteMassIsUniqueLambda = wrapRuleIntoLambdaHandler(instance);
