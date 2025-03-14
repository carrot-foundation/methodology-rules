import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { RecyclerIdentificationProcessor } from './recycler-identification.processor';

const instance = new RecyclerIdentificationProcessor();

export const recyclerIdentificationLambda = wrapRuleIntoLambdaHandler(instance);
