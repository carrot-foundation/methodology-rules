import { CreditAbsenceProcessor } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';

const instance = new CreditAbsenceProcessor(TRC_CREDIT_MATCH);

export const handler = wrapRuleIntoLambdaHandler(instance);
