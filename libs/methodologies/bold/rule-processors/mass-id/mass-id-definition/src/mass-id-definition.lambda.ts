import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassIdDefinitionProcessor } from './mass-id-definition.processor';

const instance = new MassIdDefinitionProcessor();

export const massIdDefinitionLambda = wrapRuleIntoLambdaHandler(instance);
