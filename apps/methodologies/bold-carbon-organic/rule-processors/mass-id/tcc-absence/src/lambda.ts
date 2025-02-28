import { creditAbsenceLambda } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { TCC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';

export const handler = creditAbsenceLambda(TCC_CREDIT_MATCH);
