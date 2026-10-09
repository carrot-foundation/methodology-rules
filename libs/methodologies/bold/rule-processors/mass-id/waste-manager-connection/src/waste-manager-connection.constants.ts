import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { ACTOR, DROP_OFF } = BoldDocumentEventName;

// Not in BoldActorType: BOLD has not adopted the role; Smaug's actor vocabulary accepts it.
export const WASTE_MANAGER = 'Waste Manager';

export const CIVIL_DAY_TIMEZONE = 'America/Sao_Paulo';

export const DECISION_REASONS = {
  CONNECTION_FLAGGED_FOR_REVIEW: 'the connection evidence flags it for review',
  CONNECTION_INELIGIBLE: 'the connection evidence marks it ineligible',
  DECLARED_WITH_CONFIRMED_CONNECTION: (confirmedStartDate: string) =>
    `declared actor with a connection confirmed since ${confirmedStartDate}`,
  DECLARED_WITHOUT_CONNECTION_ENTRY:
    'declared actor without an entry in the connection evidence',
  DECLARED_WITHOUT_ELIGIBLE_CONNECTION: (eligibility: string) =>
    `declared actor whose connection evidence entry is ${eligibility}`,
  DERIVED_BENEFICIARY: (confirmedStartDate: string) =>
    `derived beneficiary of a connection confirmed since ${confirmedStartDate}, without a "${WASTE_MANAGER}" actor in the MassID`,
  DROP_OFF_BEFORE_CONNECTION_START: (
    dropOffDay: string,
    confirmedStartDate: string,
  ) =>
    `the "${DROP_OFF}" day ${dropOffDay} (${CIVIL_DAY_TIMEZONE}) precedes the connection start ${confirmedStartDate}`,
  MISSING_DROP_OFF: `the MassID has no single "${DROP_OFF}" event to compare with the connection start`,
} as const;

export const RESULT_COMMENTS = {
  failed: {
    EVIDENCE_MALFORMED: (reason: string) =>
      `The connection evidence is malformed: ${reason}`,
    EVIDENCE_MISMATCH: (fields: string[]) =>
      `The connection evidence does not match the audited MassID: ${fields.join(', ')}.`,
    EVIDENCE_MISSING:
      'The connection evidence is missing, so the Waste Manager connection cannot be verified.',
  },
  passed: {
    NOT_APPLICABLE: `Not applicable: the MassID has no "${ACTOR}" event with the label "${WASTE_MANAGER}" and the connection evidence has no eligible connection.`,
    VERIFIED: (summary: string) =>
      `Waste Manager connection verified for ${summary}.`,
  },
  reviewRequired: {
    REVIEW: (summary: string) =>
      `Waste Manager connection requires review for ${summary}.`,
  },
} as const;
