import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { UniquenessCheckProcessor } from './uniqueness-check.processor';

const instance = new UniquenessCheckProcessor();

export const uniquenessCheckLambda = wrapRuleIntoLambdaHandler(instance);
