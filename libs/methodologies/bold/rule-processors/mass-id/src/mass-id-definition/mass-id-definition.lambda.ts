import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassDefinitionProcessor } from './mass-id-definition.processor';

const instance = new MassDefinitionProcessor();

export const massDefinitionLambda = wrapRuleIntoLambdaHandler(instance);
