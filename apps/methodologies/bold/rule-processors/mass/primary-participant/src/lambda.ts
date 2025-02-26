import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { PrimaryParticipantProcessor } from './lib/primary-participant.processor';

const instance = new PrimaryParticipantProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
