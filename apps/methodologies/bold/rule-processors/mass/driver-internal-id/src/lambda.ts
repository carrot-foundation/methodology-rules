import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DriverInternalIdProcessor } from './lib/driver-internal-id.processor';

const instance = new DriverInternalIdProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
