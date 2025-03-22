import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassSortingProcessor } from './mass-sorting.processor';

const instance = new MassSortingProcessor();

export const massSortingLambda = wrapRuleIntoLambdaHandler(instance);
