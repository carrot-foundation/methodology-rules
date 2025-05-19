import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassIdSortingProcessor } from './mass-id-sorting.processor';

const instance = new MassIdSortingProcessor();

export const massIdSortingLambda = wrapRuleIntoLambdaHandler(instance);
