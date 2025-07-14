import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ParticipantAccreditationsAndVerificationsRequirementsProcessor } from './participant-accreditations-and-verifications-requirements.processor';

const instance =
  new ParticipantAccreditationsAndVerificationsRequirementsProcessor();

export const participantAccreditationsAndVerificationsRequirementsLambda =
  wrapRuleIntoLambdaHandler(instance);
