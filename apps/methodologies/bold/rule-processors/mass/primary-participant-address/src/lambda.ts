import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { PrimaryParticipantAddressProcessor } from './lib/primary-participant-address.processor';

const instance = new PrimaryParticipantAddressProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
