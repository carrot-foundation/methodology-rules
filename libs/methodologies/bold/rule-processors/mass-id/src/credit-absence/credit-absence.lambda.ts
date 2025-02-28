import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';

import { CreditAbsenceProcessor } from './credit-absence.processor';

export const creditAbsenceLambda = (creditMatcher: DocumentMatcher) => {
  const instance = new CreditAbsenceProcessor(creditMatcher);

  return wrapRuleIntoLambdaHandler(instance);
};
