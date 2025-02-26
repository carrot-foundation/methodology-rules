import { CheckParticipantsHomologationProcessor } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

const instance = new CheckParticipantsHomologationProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
