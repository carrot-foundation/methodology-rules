import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { PreventedEmissionsProcessor } from './prevented-emissions.processor';

const instance = new PreventedEmissionsProcessor();

export const preventedEmissionsLambda = wrapRuleIntoLambdaHandler(instance);
