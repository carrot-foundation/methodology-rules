import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { PrimaryParticipantAddressProcessor } from './lib/primary-participant-address.processor';

const instance = new PrimaryParticipantAddressProcessor();

// TODO: we can try to generate this code with a ts-patch program transformer
export const handler = wrapRuleIntoLambdaHandler(instance);
