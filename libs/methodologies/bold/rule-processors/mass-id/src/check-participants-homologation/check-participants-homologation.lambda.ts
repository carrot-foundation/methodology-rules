import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CheckParticipantsHomologationProcessor } from './check-participants-homologation.processor';

const instance = new CheckParticipantsHomologationProcessor();

export const checkParticipantsHomologationLambda =
  wrapRuleIntoLambdaHandler(instance);
