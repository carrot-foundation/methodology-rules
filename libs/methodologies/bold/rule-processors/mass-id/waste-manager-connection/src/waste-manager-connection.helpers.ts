import type {
  MassIDConfirmedConnectionEntry,
  MassIDConnectionEvidence,
  MassIDConnectionEvidenceWasteManager,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil, utcIsoToLocalDate } from '@carrot-fndn/shared/helpers';

import type {
  WasteManagerConnectionRuleSubject,
  WasteManagerDecision,
} from './waste-manager-connection.types';

import {
  CIVIL_DAY_TIMEZONE,
  DECISION_REASONS,
  RESULT_COMMENTS,
} from './waste-manager-connection.constants';

export const toCivilDay = (dateTime: string): string =>
  utcIsoToLocalDate(dateTime, CIVIL_DAY_TIMEZONE);

const toInstant = (dateTime: null | string): null | number =>
  dateTime === null ? null : new Date(dateTime).getTime();

export const findEvidenceMismatches = (
  subject: WasteManagerConnectionRuleSubject,
  evidence: MassIDConnectionEvidence,
): string[] => {
  const declaredIds = new Set(subject.wasteManagerParticipantIds);
  const mismatches: string[] = [];

  if (evidence.documentId !== subject.executionDocumentId) {
    mismatches.push('documentId');
  }

  if (evidence.massId !== subject.massIDDocumentId) {
    mismatches.push('massId');
  }

  if (
    evidence.generatorPalantirParticipantId !==
    (subject.wasteGeneratorParticipantId ?? null)
  ) {
    mismatches.push('generatorPalantirParticipantId');
  }

  if (
    toInstant(evidence.dropOffDate) !== toInstant(subject.dropOffDate ?? null)
  ) {
    mismatches.push('dropOffDate');
  }

  for (const entry of evidence.wasteManagers) {
    const isDeclaredInEvidence = entry.source !== 'connection';

    if (isDeclaredInEvidence !== declaredIds.has(entry.palantirParticipantId)) {
      mismatches.push(`wasteManagers[${entry.palantirParticipantId}].source`);
    }
  }

  return mismatches;
};

const findConnectionPeriodIssue = (
  { confirmedStartDate, effectiveEndDate }: MassIDConfirmedConnectionEntry,
  dropOffDate: string | undefined,
): string | undefined => {
  if (isNil(dropOffDate)) {
    return DECISION_REASONS.MISSING_DROP_OFF;
  }

  const dropOffDay = toCivilDay(dropOffDate);

  if (dropOffDay < confirmedStartDate) {
    return DECISION_REASONS.DROP_OFF_BEFORE_CONNECTION_START(
      dropOffDay,
      confirmedStartDate,
    );
  }

  return effectiveEndDate !== null && dropOffDay >= effectiveEndDate
    ? DECISION_REASONS.DROP_OFF_ON_OR_AFTER_CONNECTION_END(
        dropOffDay,
        effectiveEndDate,
      )
    : undefined;
};

const decideDeclaredWasteManager = (
  palantirParticipantId: string,
  entry: MassIDConnectionEvidenceWasteManager | undefined,
  dropOffDate: string | undefined,
): WasteManagerDecision => {
  const origin = 'declared';

  if (isNil(entry)) {
    return {
      decision: 'review',
      origin,
      palantirParticipantId,
      reason: DECISION_REASONS.DECLARED_WITHOUT_CONNECTION_ENTRY,
    };
  }

  if (entry.eligibility !== 'eligible') {
    return {
      decision: 'review',
      origin,
      palantirParticipantId,
      reason: DECISION_REASONS.DECLARED_WITHOUT_ELIGIBLE_CONNECTION(
        entry.eligibility,
      ),
    };
  }

  const connectionPeriodIssue = findConnectionPeriodIssue(entry, dropOffDate);

  return {
    decision: isNil(connectionPeriodIssue) ? 'approved' : 'review',
    origin,
    palantirParticipantId,
    reason:
      connectionPeriodIssue ??
      DECISION_REASONS.DECLARED_WITH_CONFIRMED_CONNECTION(
        entry.confirmedStartDate,
      ),
  };
};

const decideConnectionOnlyWasteManager = (
  entry: MassIDConfirmedConnectionEntry,
  dropOffDate: string | undefined,
): WasteManagerDecision => {
  const { palantirParticipantId } = entry;
  const origin = 'connection';

  if (entry.eligibility === 'ineligible') {
    return {
      decision: 'excluded',
      origin,
      palantirParticipantId,
      reason: DECISION_REASONS.CONNECTION_INELIGIBLE,
    };
  }

  if (entry.eligibility === 'review') {
    return {
      decision: 'review',
      origin,
      palantirParticipantId,
      reason: DECISION_REASONS.CONNECTION_FLAGGED_FOR_REVIEW,
    };
  }

  const connectionPeriodIssue = findConnectionPeriodIssue(entry, dropOffDate);

  return {
    decision: isNil(connectionPeriodIssue) ? 'approved' : 'review',
    origin,
    palantirParticipantId,
    reason:
      connectionPeriodIssue ??
      DECISION_REASONS.DERIVED_BENEFICIARY(entry.confirmedStartDate),
  };
};

export const decideWasteManagers = (
  subject: WasteManagerConnectionRuleSubject,
  evidence: MassIDConnectionEvidence,
): WasteManagerDecision[] => {
  const entriesByParticipantId = new Map(
    evidence.wasteManagers.map((entry) => [entry.palantirParticipantId, entry]),
  );

  const declaredDecisions = subject.wasteManagerParticipantIds.map(
    (palantirParticipantId) =>
      decideDeclaredWasteManager(
        palantirParticipantId,
        entriesByParticipantId.get(palantirParticipantId),
        subject.dropOffDate,
      ),
  );

  const connectionOnlyDecisions = evidence.wasteManagers.flatMap((entry) =>
    entry.source === 'connection'
      ? [decideConnectionOnlyWasteManager(entry, subject.dropOffDate)]
      : [],
  );

  return [...declaredDecisions, ...connectionOnlyDecisions];
};

const summarizeDecisions = (decisions: WasteManagerDecision[]): string =>
  decisions
    .map(
      ({ palantirParticipantId, reason }) =>
        `${palantirParticipantId} (${reason})`,
    )
    .join('; ');

export const evaluateWasteManagerConnection = (
  subject: WasteManagerConnectionRuleSubject,
): EvaluateResultOutput => {
  const { connectionEvidence } = subject;

  if (connectionEvidence.status === 'missing') {
    return {
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISSING,
      resultStatus: 'FAILED',
    };
  }

  if (connectionEvidence.status === 'malformed') {
    return {
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MALFORMED(
        connectionEvidence.reason,
      ),
      resultStatus: 'FAILED',
    };
  }

  const { evidence } = connectionEvidence;
  const mismatches = findEvidenceMismatches(subject, evidence);

  if (mismatches.length > 0) {
    return {
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISMATCH(mismatches),
      resultStatus: 'FAILED',
    };
  }

  const decisions = decideWasteManagers(subject, evidence);
  const resultContent = {
    connectionHistory: evidence.connectionHistory,
    policyVersion: evidence.policyVersion,
    wasteManagers: decisions,
  };

  if (evidence.connectionHistory === 'incomplete') {
    return {
      resultComment:
        RESULT_COMMENTS.reviewRequired.INCOMPLETE_CONNECTION_HISTORY,
      resultContent,
      resultStatus: 'REVIEW_REQUIRED',
    };
  }

  const reviewDecisions = decisions.filter(
    ({ decision }) => decision === 'review',
  );

  if (reviewDecisions.length > 0) {
    return {
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summarizeDecisions(reviewDecisions),
      ),
      resultContent,
      resultStatus: 'REVIEW_REQUIRED',
    };
  }

  const approvedDecisions = decisions.filter(
    ({ decision }) => decision === 'approved',
  );

  return {
    resultComment:
      approvedDecisions.length > 0
        ? RESULT_COMMENTS.passed.VERIFIED(summarizeDecisions(approvedDecisions))
        : RESULT_COMMENTS.passed.NOT_APPLICABLE,
    resultContent,
    resultStatus: 'PASSED',
  };
};
