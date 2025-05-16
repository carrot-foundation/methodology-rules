import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ParticipantHomologationsProcessor } from './participant-homologations.processor';

const instance = new ParticipantHomologationsProcessor();

export const participantHomologationsLambda =
  wrapRuleIntoLambdaHandler(instance);
