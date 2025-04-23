import { creditAbsenceLambda } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';

export const handler = creditAbsenceLambda(TRC_CREDIT_MATCH);
