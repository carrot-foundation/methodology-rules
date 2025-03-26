import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { AvoidedEmissionsProcessor } from './avoided-emissions.processor';

const instance = new AvoidedEmissionsProcessor();

export const avoidedEmissionsLambda = wrapRuleIntoLambdaHandler(instance);
