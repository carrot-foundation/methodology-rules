import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ParticipantHomologationsRequirementsProcessor } from './participant-homologations-requirements.processor';

const instance = new ParticipantHomologationsRequirementsProcessor();

export const participantHomologationsRequirementsLambda =
  wrapRuleIntoLambdaHandler(instance);
