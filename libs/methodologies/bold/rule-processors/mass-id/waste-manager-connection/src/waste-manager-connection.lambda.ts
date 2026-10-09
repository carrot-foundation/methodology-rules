import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { WasteManagerConnectionProcessor } from './waste-manager-connection.processor';

const instance = new WasteManagerConnectionProcessor();

export const wasteManagerConnectionLambda = wrapRuleIntoLambdaHandler(instance);
