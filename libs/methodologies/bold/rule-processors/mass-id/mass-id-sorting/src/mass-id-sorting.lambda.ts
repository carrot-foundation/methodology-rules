import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassIDSortingProcessor } from './mass-id-sorting.processor';

const instance = new MassIDSortingProcessor();

export const massIDSortingLambda = wrapRuleIntoLambdaHandler(instance);
