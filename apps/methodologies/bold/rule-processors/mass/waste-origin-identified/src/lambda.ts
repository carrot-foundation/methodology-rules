import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { WasteOriginIdentifiedProcessor } from './lib/waste-origin-identified.processor';

const instance = new WasteOriginIdentifiedProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
