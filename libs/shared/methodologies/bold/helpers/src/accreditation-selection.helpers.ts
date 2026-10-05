import { isActorEvent } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  BoldAccreditationStatus,
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DateTimeSchema } from '@carrot-fndn/shared/types';
import { isSameDay } from 'date-fns';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

import {
  ACCREDITATION_EVALUATION_ATTRIBUTE,
  ACCREDITATION_EVALUATION_EVENT,
  ACCREDITATION_HISTORY_ATTRIBUTE,
  ACCREDITATION_HISTORY_EVENT,
  type AccreditationCandidate,
  AccreditationDateSchema,
  type AccreditationEvaluationContext,
  AccreditationEvaluationSchema,
  type AccreditationHistory,
  AccreditationHistorySchema,
  type AccreditationRole,
  type AccreditationSelectionInput,
  type AccreditationSelectionResult,
} from './accreditation-selection.types';

const readPrivateMetadata = <T>(
  document: BoldDocument,
  eventName: string,
  attributeName: string,
  schema: z.ZodType<T>,
):
  | { status: 'ABSENT' }
  | { status: 'MALFORMED' }
  | { status: 'PRESENT'; value: T } => {
  const events = document.externalEvents ?? [];
  const matchingEvents = events.filter((event) => event.name === eventName);
  const attributes = events.flatMap((event) =>
    (event.metadata?.attributes ?? []).filter(
      (attribute) => attribute.name === attributeName,
    ),
  );

  if (matchingEvents.length === 0 && attributes.length === 0) {
    return { status: 'ABSENT' };
  }

  const event = matchingEvents[0];
  const attribute = attributes[0];

  if (
    matchingEvents.length !== 1 ||
    attributes.length !== 1 ||
    event?.isPublic !== false ||
    attribute?.isPublic !== false ||
    event.metadata?.attributes?.includes(attribute) !== true
  ) {
    return { status: 'MALFORMED' };
  }

  const parsed = schema.safeParse(attribute.value);

  return parsed.success
    ? { status: 'PRESENT', value: parsed.data }
    : { status: 'MALFORMED' };
};

export const getAccreditationEvaluationContext = (
  auditDocument: BoldDocument,
  legacyEvaluationDate: string,
): AccreditationEvaluationContext => {
  const context = readPrivateMetadata(
    auditDocument,
    ACCREDITATION_EVALUATION_EVENT,
    ACCREDITATION_EVALUATION_ATTRIBUTE,
    AccreditationEvaluationSchema,
  );

  if (context.status === 'MALFORMED') {
    throw new Error('Accreditation evaluation context is malformed');
  }

  if (context.status === 'ABSENT') {
    return {
      evaluationDate: legacyEvaluationDate,
      methodologyId: undefined,
      methodologyVersion: undefined,
    };
  }

  const { evaluationDate, methodologyId, methodologyVersion } = context.value;

  return { evaluationDate, methodologyId, methodologyVersion };
};

const sameHistoryScope = (
  left: AccreditationHistory['scope'],
  right: AccreditationHistory['scope'],
): boolean =>
  left.participantId === right.participantId &&
  left.facilityId === right.facilityId &&
  left.role === right.role &&
  left.methodologyId === right.methodologyId &&
  left.methodologyVersion === right.methodologyVersion;

const parseCandidate = (
  document: BoldDocument,
): AccreditationCandidate | undefined => {
  const metadata = readPrivateMetadata(
    document,
    ACCREDITATION_HISTORY_EVENT,
    ACCREDITATION_HISTORY_ATTRIBUTE,
    AccreditationHistorySchema,
  );

  if (metadata.status === 'ABSENT') {
    return { document, history: undefined };
  }

  if (metadata.status === 'MALFORMED') {
    return undefined;
  }

  const history = metadata.value;

  if (
    history.scope.participantId !== document.primaryParticipant.id ||
    history.scope.role !== document.subtype ||
    (history.scope.facilityId !== null &&
      (history.scope.facilityId !== document.primaryAddress.id ||
        document.primaryAddress.participantId !==
          document.primaryParticipant.id))
  ) {
    return undefined;
  }

  return { document, history };
};

const hasSupersessionCycle = (
  history: AccreditationHistory,
  revisions: Map<string, AccreditationHistory>,
): boolean => {
  const visited = new Set<string>();
  let ancestor: AccreditationHistory | undefined = history;

  while (ancestor) {
    if (visited.has(ancestor.revisionId)) {
      return true;
    }

    visited.add(ancestor.revisionId);
    ancestor =
      ancestor.supersedesRevisionId === undefined
        ? undefined
        : revisions.get(ancestor.supersedesRevisionId);
  }

  return false;
};

const validateHistory = (
  candidates: AccreditationCandidate[],
): AccreditationSelectionResult | undefined => {
  const revisions = new Map<string, AccreditationHistory>();

  for (const { history } of candidates) {
    if (history === undefined) {
      continue;
    }

    if (revisions.has(history.revisionId)) {
      return { reason: 'Conflicting revision identity', status: 'MALFORMED' };
    }

    revisions.set(history.revisionId, history);
  }

  const successors = new Set<string>();

  for (const history of revisions.values()) {
    const targetId = history.supersedesRevisionId;

    if (targetId === undefined) {
      continue;
    }

    const target = revisions.get(targetId);

    if (
      target === undefined ||
      !sameHistoryScope(target.scope, history.scope)
    ) {
      return {
        reason: 'Missing or out-of-scope supersession target',
        status: 'MALFORMED',
      };
    }

    if (successors.has(targetId)) {
      return { reason: 'Divergent successors', status: 'AMBIGUOUS' };
    }

    successors.add(targetId);

    if (hasSupersessionCycle(history, revisions)) {
      return { reason: 'Cyclic supersession', status: 'MALFORMED' };
    }
  }

  return undefined;
};

const ResultSchema = z.object({
  effectiveDate: AccreditationDateSchema,
  expirationDate: AccreditationDateSchema.optional(),
  status: z.enum([
    BoldAccreditationStatus.APPROVED,
    BoldAccreditationStatus.REJECTED,
  ]),
});

const evaluateResultEvent = (
  { document, history }: AccreditationCandidate,
  evaluationDate: string,
): AccreditationSelectionResult => {
  const result = document.externalEvents?.filter(
    (event) => event.name === BoldDocumentEventName.ACCREDITATION_RESULT,
  );

  if (result?.length !== 1) {
    return { reason: 'Multiple accreditation results', status: 'MALFORMED' };
  }

  const attributes = result[0]?.metadata?.attributes ?? [];
  const names = [
    BoldAttributeName.EFFECTIVE_DATE,
    BoldAttributeName.EXPIRATION_DATE,
    BoldAttributeName.ACCREDITATION_STATUS,
  ];

  if (
    names.some(
      (name) =>
        attributes.filter((attribute) => attribute.name === name).length > 1,
    )
  ) {
    return {
      reason: 'Duplicate accreditation result attributes',
      status: 'MALFORMED',
    };
  }

  const parsed = ResultSchema.safeParse({
    effectiveDate: attributes.find(
      (attribute) => attribute.name === BoldAttributeName.EFFECTIVE_DATE,
    )?.value,
    expirationDate: attributes.find(
      (attribute) => attribute.name === BoldAttributeName.EXPIRATION_DATE,
    )?.value,
    status: attributes.find(
      (attribute) => attribute.name === BoldAttributeName.ACCREDITATION_STATUS,
    )?.value,
  });

  if (!parsed.success) {
    return { reason: 'Malformed accreditation result', status: 'MALFORMED' };
  }

  if (parsed.data.status === BoldAccreditationStatus.REJECTED) {
    return {
      reason: 'Rejected accreditation result',
      status: history === undefined ? 'REJECTED' : 'MALFORMED',
    };
  }

  const periodError = validateEffectivePeriod(
    parsed.data,
    history,
    evaluationDate,
  );

  return periodError ?? { document, status: 'SELECTED' };
};

const validateEffectivePeriod = (
  { effectiveDate, expirationDate }: z.infer<typeof ResultSchema>,
  history: AccreditationHistory | undefined,
  evaluationDate: string,
): AccreditationSelectionResult | undefined => {
  const effective = new Date(effectiveDate);
  const expiration =
    expirationDate === undefined ? undefined : new Date(expirationDate);
  const evaluation = new Date(evaluationDate);
  const effectiveDay = effective.toISOString().slice(0, 10);
  const evaluationDay = evaluation.toISOString().slice(0, 10);

  if (history === undefined) {
    if (
      !DateTimeSchema.safeParse(effectiveDate).success ||
      (expirationDate !== undefined &&
        !DateTimeSchema.safeParse(expirationDate).success)
    ) {
      return {
        reason: 'Legacy accreditation dates require timestamps',
        status: 'MALFORMED',
      };
    }

    if (
      (effective > evaluation && !isSameDay(effective, evaluation)) ||
      (expiration !== undefined &&
        expiration < evaluation &&
        !isSameDay(expiration, evaluation))
    ) {
      return {
        reason: 'Accreditation is outside its effective period',
        status: 'INACTIVE',
      };
    }
  } else {
    if (history.effectiveFrom !== effectiveDay) {
      return {
        reason: 'History and result effective dates disagree',
        status: 'MALFORMED',
      };
    }

    if (
      effectiveDay > evaluationDay ||
      (expiration !== undefined &&
        expiration.toISOString().slice(0, 10) < evaluationDay)
    ) {
      return {
        reason: 'Accreditation is outside its effective period',
        status: 'INACTIVE',
      };
    }
  }

  return undefined;
};

const evaluateCandidate = (
  candidate: AccreditationCandidate,
  evaluationDate: string,
  role: AccreditationRole,
): AccreditationSelectionResult => {
  const { document, history } = candidate;

  if (history !== undefined && history.disposition !== 'APPROVED') {
    return {
      reason: 'Explicit revision disposition',
      status: history.disposition,
    };
  }

  if (
    !(document.externalEvents ?? []).some(
      (event) => event.name === BoldDocumentEventName.ACCREDITATION_RESULT,
    )
  ) {
    return role === 'Integrator' ||
      role === 'Waste Generator' ||
      role === 'Hauler'
      ? { document, status: 'SELECTED' }
      : { reason: 'Accreditation result is required', status: 'INACTIVE' };
  }

  return evaluateResultEvent(candidate, evaluationDate);
};

const collectCandidates = (
  input: AccreditationSelectionInput,
): AccreditationCandidate[] | AccreditationSelectionResult => {
  const documents = new Map<string, BoldDocument>();
  const candidates: AccreditationCandidate[] = [];

  for (const document of input.accreditationDocuments) {
    if (
      document.primaryParticipant.id !== input.participantId ||
      document.subtype !== input.role
    ) {
      continue;
    }

    const previous = documents.get(document.id);

    if (previous !== undefined) {
      if (!isDeepStrictEqual(previous, document)) {
        return { reason: 'Conflicting document identity', status: 'MALFORMED' };
      }

      continue;
    }

    documents.set(document.id, document);
    const candidate = parseCandidate(document);

    if (candidate === undefined) {
      return { reason: 'Malformed accreditation history', status: 'MALFORMED' };
    }

    candidates.push(candidate);
  }

  return candidates;
};

const isOptionalFacilityRole = (role: AccreditationRole): boolean =>
  role === 'Integrator' || role === 'Auditor' || role === 'Hauler';

const isInScope = (
  candidate: AccreditationCandidate,
  input: AccreditationSelectionInput,
  evaluationDay: string,
): boolean => {
  const { document, history } = candidate;

  return history === undefined
    ? input.facilityId === null ||
        document.primaryAddress.id === input.facilityId
    : (history.scope.facilityId === input.facilityId ||
        (history.scope.facilityId === null &&
          isOptionalFacilityRole(input.role))) &&
        history.scope.methodologyId === input.methodologyId &&
        history.scope.methodologyVersion === input.methodologyVersion &&
        history.effectiveFrom <= evaluationDay;
};

export const selectAccreditation = (
  input: AccreditationSelectionInput,
): AccreditationSelectionResult => {
  const evaluation = AccreditationDateSchema.safeParse(input.evaluationDate);

  if (!evaluation.success) {
    return {
      reason: 'Explicit evaluation date is invalid',
      status: 'MALFORMED',
    };
  }

  const candidates = collectCandidates(input);

  if (!Array.isArray(candidates)) {
    return candidates;
  }

  if (
    candidates.some(({ history }) => history !== undefined) &&
    (input.methodologyId === undefined ||
      input.methodologyVersion === undefined)
  ) {
    return {
      reason: 'New history requires explicit methodology context',
      status: 'MALFORMED',
    };
  }

  const historyError = validateHistory(candidates);

  if (historyError !== undefined) {
    return historyError;
  }

  const evaluationDay = new Date(evaluation.data).toISOString().slice(0, 10);
  const inScope = candidates.filter((candidate) =>
    isInScope(candidate, input, evaluationDay),
  );

  if (
    inScope.some(({ history }) => history === undefined) &&
    inScope.some(
      ({ history }) =>
        history !== undefined &&
        (history.supersedesRevisionId !== undefined ||
          history.disposition === 'REVOKED'),
    )
  ) {
    return {
      reason: 'Legacy lineage is unknown beside effective supersession',
      status: 'AMBIGUOUS',
    };
  }

  const superseded = new Set(
    inScope.flatMap(({ history }) =>
      history?.supersedesRevisionId === undefined
        ? []
        : [history.supersedesRevisionId],
    ),
  );
  const outcomes = inScope
    .filter(
      ({ history }) =>
        history === undefined || !superseded.has(history.revisionId),
    )
    .map((candidate) =>
      evaluateCandidate(candidate, input.evaluationDate, input.role),
    );
  const malformed = outcomes.find((outcome) => outcome.status === 'MALFORMED');

  if (malformed !== undefined) {
    return malformed;
  }

  const selected = outcomes.filter((outcome) => outcome.status === 'SELECTED');

  if (selected.length > 1) {
    return {
      reason: 'Competing effective accreditations',
      status: 'AMBIGUOUS',
    };
  }

  return (
    selected[0] ??
    outcomes.find((outcome) => outcome.status === 'REVOKED') ??
    outcomes.find((outcome) => outcome.status === 'REJECTED') ??
    outcomes[0] ?? {
      reason: 'No matching effective accreditation',
      status: candidates.length === 0 ? 'MISSING' : 'INACTIVE',
    }
  );
};

export const selectActorAccreditation = ({
  accreditationDocuments,
  actorScope,
  evaluation,
  massIDDocument,
  role,
}: {
  accreditationDocuments: readonly BoldDocument[];
  actorScope?: { facilityId?: string; participantId: string };
  evaluation: AccreditationEvaluationContext;
  massIDDocument: BoldDocument;
  role: AccreditationRole;
}): AccreditationSelectionResult => {
  const actors = (massIDDocument.externalEvents ?? []).filter(
    (event) =>
      isActorEvent(event) &&
      event.label === role &&
      (actorScope === undefined ||
        (event.participant.id === actorScope.participantId &&
          (actorScope.facilityId === undefined ||
            event.address.id === actorScope.facilityId))),
  );
  const actor = actors[0];

  if (actor === undefined) {
    return {
      reason: 'Actor is missing',
      status: accreditationDocuments.some(
        (document) => document.subtype === role,
      )
        ? 'MALFORMED'
        : 'MISSING',
    };
  }

  if (
    actors.some(
      (event) =>
        event.participant.id !== actor.participant.id ||
        event.address.id !== actor.address.id,
    )
  ) {
    return { reason: 'Conflicting actor scopes', status: 'AMBIGUOUS' };
  }

  if (
    actors.some((event) => event.address.participantId !== event.participant.id)
  ) {
    return {
      reason: 'Actor facility belongs to another participant',
      status: 'MALFORMED',
    };
  }

  return selectAccreditation({
    ...evaluation,
    accreditationDocuments,
    facilityId: actor.address.id,
    participantId: actor.participant.id,
    role,
  });
};
