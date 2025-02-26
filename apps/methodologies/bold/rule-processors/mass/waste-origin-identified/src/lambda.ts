import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { WasteOriginIdentifiedProcessor } from './lib/waste-origin-identified.processor';

const instance = new WasteOriginIdentifiedProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
