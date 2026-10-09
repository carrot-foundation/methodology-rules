import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  stubBoldMassIDDocument,
  stubBoldMassIDDropOffEvent,
  stubDocumentEvent,
  stubMassIDConfirmedConnectionEntry,
  stubMassIDConnectionEvidence,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventLabel,
  BoldDocumentEventName,
  type MassIDConfirmedConnectionEntry,
  type MassIDConnectionEvidence,
  MassIDConnectionEvidenceSchema,
  type MassIDConnectionEvidenceWasteManager,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

import {
  DECISION_REASONS,
  RESULT_COMMENTS,
  WASTE_MANAGER,
} from './waste-manager-connection.constants';

const { ACTOR, DROP_OFF } = BoldDocumentEventName;
const { WASTE_GENERATOR } = BoldDocumentEventLabel;

export interface EvidenceContext {
  documentId: string;
  dropOffDate: null | string;
  generatorPalantirParticipantId: null | string;
  massId: string;
}

export interface WasteManagerConnectionTestCase extends RuleTestCase {
  declaredWasteManagerIds: string[];
  dropOffDate: string | undefined;
  evidence: ((context: EvidenceContext) => unknown) | undefined;
  extraExternalEvents?: BoldDocumentEvent[] | undefined;
  hasWasteGenerator?: false;
}

export const FIRST_WASTE_MANAGER_ID = faker.string.uuid();
export const SECOND_WASTE_MANAGER_ID = faker.string.uuid();

const DROP_OFF_DATE = '2026-10-09T15:00:00.000Z';
const DROP_OFF_DAY = '2026-10-09';
const SAO_PAULO_MIDNIGHT = '2026-10-09T03:00:00.000Z';
const LAST_INSTANT_BEFORE_SAO_PAULO_MIDNIGHT = '2026-10-09T02:59:59.999Z';
const NEXT_DAY = '2026-10-10';
const CONNECTION_START = '2026-10-01';

export const POLICY_VERSION = '1.0.0';

const confirmedEntry = (
  palantirParticipantId: string,
  partialEntry: Partial<MassIDConfirmedConnectionEntry> = {},
): MassIDConfirmedConnectionEntry =>
  stubMassIDConfirmedConnectionEntry({
    confirmedStartDate: CONNECTION_START,
    palantirParticipantId,
    ...partialEntry,
  });

export const stubWasteManagerConnectionMassIDDocument = ({
  declaredWasteManagerIds,
  dropOffDate,
  extraExternalEvents = [],
  generatorPalantirParticipantId,
}: Pick<
  WasteManagerConnectionTestCase,
  'declaredWasteManagerIds' | 'dropOffDate' | 'extraExternalEvents'
> & { generatorPalantirParticipantId: null | string }): BoldDocument =>
  stubBoldMassIDDocument({
    externalEventsMap: {
      [DROP_OFF]: isNil(dropOffDate)
        ? undefined
        : stubBoldMassIDDropOffEvent({
            partialDocumentEvent: { externalCreatedAt: dropOffDate },
          }),
    },
    partialDocument: {
      externalEvents: [
        ...(isNil(generatorPalantirParticipantId)
          ? []
          : [
              stubDocumentEvent({
                label: WASTE_GENERATOR,
                name: ACTOR,
                participant: { id: generatorPalantirParticipantId },
              }),
            ]),
        ...declaredWasteManagerIds.map((palantirParticipantId) =>
          stubDocumentEvent({
            label: WASTE_MANAGER,
            name: ACTOR,
            participant: { id: palantirParticipantId },
          }),
        ),
        ...extraExternalEvents,
      ],
    },
  });

export const buildEvidence =
  (wasteManagers: MassIDConnectionEvidenceWasteManager[]) =>
  (context: EvidenceContext): MassIDConnectionEvidence =>
    stubMassIDConnectionEvidence({
      ...context,
      policyVersion: POLICY_VERSION,
      wasteManagers,
    });

const MALFORMED_EVIDENCE = { version: 2 };

export const describeSchemaIssues = (rawEvidence: unknown): string => {
  const parsed = MassIDConnectionEvidenceSchema.safeParse(rawEvidence);

  return parsed.success ? '' : z.prettifyError(parsed.error);
};

const summary = (...parts: Array<[string, string]>) =>
  parts.map(([id, reason]) => `${id} (${reason})`).join('; ');

export const wasteManagerConnectionTestCases: WasteManagerConnectionTestCase[] =
  [
    {
      declaredWasteManagerIds: [],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([]),
      resultComment: RESULT_COMMENTS.passed.NOT_APPLICABLE,
      resultStatus: 'PASSED',
      scenario:
        'the MassID has no Waste Manager and the evidence no connection',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([confirmedEntry(FIRST_WASTE_MANAGER_ID)]),
      resultComment: RESULT_COMMENTS.passed.VERIFIED(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITH_CONFIRMED_CONNECTION(CONNECTION_START),
        ]),
      ),
      resultStatus: 'PASSED',
      scenario:
        'the declared Waste Manager has an eligible connection started before the Drop-off',
    },
    {
      declaredWasteManagerIds: [],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, { source: 'connection' }),
      ]),
      resultComment: RESULT_COMMENTS.passed.VERIFIED(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DERIVED_BENEFICIARY(CONNECTION_START),
        ]),
      ),
      resultStatus: 'PASSED',
      scenario:
        'an eligible connection has no Waste Manager actor in the MassID (derived beneficiary)',
    },
    {
      declaredWasteManagerIds: [],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, {
          eligibility: 'ineligible',
          reason: 'policy-excluded',
          source: 'connection',
        }),
      ]),
      resultComment: RESULT_COMMENTS.passed.NOT_APPLICABLE,
      resultStatus: 'PASSED',
      scenario:
        'the only connection is ineligible and has no Waste Manager actor in the MassID',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITHOUT_CONNECTION_ENTRY,
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'the declared Waste Manager has no entry in the connection evidence',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        {
          eligibility: 'ineligible',
          palantirParticipantId: FIRST_WASTE_MANAGER_ID,
          reason: 'no-confirmed-connection',
          source: 'integrator',
        },
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITHOUT_ELIGIBLE_CONNECTION('ineligible'),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'the declared Waste Manager was declared by the integrator without a confirmed connection',
    },
    {
      declaredWasteManagerIds: [],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, {
          eligibility: 'review',
          source: 'connection',
        }),
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.CONNECTION_FLAGGED_FOR_REVIEW,
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario: 'the evidence flags a connection without actor for review',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, {
          confirmedStartDate: NEXT_DAY,
        }),
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DROP_OFF_BEFORE_CONNECTION_START(
            DROP_OFF_DAY,
            NEXT_DAY,
          ),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario: 'the Drop-off happened before the connection start',
    },
    {
      declaredWasteManagerIds: [],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, {
          confirmedStartDate: NEXT_DAY,
          source: 'connection',
        }),
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DROP_OFF_BEFORE_CONNECTION_START(
            DROP_OFF_DAY,
            NEXT_DAY,
          ),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'a connection without actor started after the Drop-off, so it is not a derived beneficiary',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        {
          eligibility: 'ineligible',
          palantirParticipantId: FIRST_WASTE_MANAGER_ID,
          reason: 'no-identified-generator',
          source: 'integrator',
        },
      ]),
      hasWasteGenerator: false,
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITHOUT_ELIGIBLE_CONNECTION('ineligible'),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'the MassID declares a Waste Manager but no Waste Generator to connect it to',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: SAO_PAULO_MIDNIGHT,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, {
          confirmedStartDate: DROP_OFF_DAY,
        }),
      ]),
      resultComment: RESULT_COMMENTS.passed.VERIFIED(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITH_CONFIRMED_CONNECTION(DROP_OFF_DAY),
        ]),
      ),
      resultStatus: 'PASSED',
      scenario:
        'the Drop-off happened at 00:00 in America/Sao_Paulo of the connection start day',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: LAST_INSTANT_BEFORE_SAO_PAULO_MIDNIGHT,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, {
          confirmedStartDate: DROP_OFF_DAY,
        }),
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DROP_OFF_BEFORE_CONNECTION_START(
            '2026-10-08',
            DROP_OFF_DAY,
          ),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'the Drop-off happened on the connection start day in UTC but the day before in America/Sao_Paulo',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: undefined,
      evidence: buildEvidence([confirmedEntry(FIRST_WASTE_MANAGER_ID)]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([FIRST_WASTE_MANAGER_ID, DECISION_REASONS.MISSING_DROP_OFF]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario: 'the MassID has no Drop-off event',
    },
    {
      declaredWasteManagerIds: [
        FIRST_WASTE_MANAGER_ID,
        SECOND_WASTE_MANAGER_ID,
      ],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID),
        {
          eligibility: 'review',
          palantirParticipantId: SECOND_WASTE_MANAGER_ID,
          source: 'integrator',
        },
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          SECOND_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITHOUT_ELIGIBLE_CONNECTION('review'),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'one of two declared Waste Managers lacks an eligible connection, so only that one goes to review',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID),
        confirmedEntry(SECOND_WASTE_MANAGER_ID, { source: 'connection' }),
      ]),
      resultComment: RESULT_COMMENTS.passed.VERIFIED(
        summary(
          [
            FIRST_WASTE_MANAGER_ID,
            DECISION_REASONS.DECLARED_WITH_CONFIRMED_CONNECTION(
              CONNECTION_START,
            ),
          ],
          [
            SECOND_WASTE_MANAGER_ID,
            DECISION_REASONS.DERIVED_BENEFICIARY(CONNECTION_START),
          ],
        ),
      ),
      resultStatus: 'PASSED',
      scenario:
        'a declared Waste Manager and a derived beneficiary are both eligible',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: '2026-10-09T12:00:00-03:00',
      evidence: (context) =>
        buildEvidence([confirmedEntry(FIRST_WASTE_MANAGER_ID)])({
          ...context,
          dropOffDate: DROP_OFF_DATE,
        }),
      resultComment: RESULT_COMMENTS.passed.VERIFIED(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITH_CONFIRMED_CONNECTION(CONNECTION_START),
        ]),
      ),
      resultStatus: 'PASSED',
      scenario:
        'the evidence writes the Drop-off instant with another UTC offset',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([confirmedEntry(FIRST_WASTE_MANAGER_ID)]),
      extraExternalEvents: [
        stubBoldMassIDDropOffEvent({
          partialDocumentEvent: { externalCreatedAt: SAO_PAULO_MIDNIGHT },
        }),
      ],
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISMATCH(['dropOffDate']),
      resultStatus: 'FAILED',
      scenario:
        'the MassID has two Drop-off events and the evidence names one of them',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: (context) =>
        buildEvidence([confirmedEntry(FIRST_WASTE_MANAGER_ID)])({
          ...context,
          dropOffDate: null,
        }),
      extraExternalEvents: [
        stubBoldMassIDDropOffEvent({
          partialDocumentEvent: { externalCreatedAt: SAO_PAULO_MIDNIGHT },
        }),
      ],
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([FIRST_WASTE_MANAGER_ID, DECISION_REASONS.MISSING_DROP_OFF]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario: 'the MassID has two Drop-off events, so no single Drop-off day',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: (context) =>
        buildEvidence([
          {
            eligibility: 'review',
            palantirParticipantId: FIRST_WASTE_MANAGER_ID,
            source: 'integrator',
          },
        ])({ ...context, generatorPalantirParticipantId: null }),
      extraExternalEvents: [
        stubDocumentEvent({
          label: WASTE_GENERATOR,
          name: ACTOR,
          participant: { id: faker.string.uuid() },
        }),
      ],
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITHOUT_ELIGIBLE_CONNECTION('review'),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'the MassID has two distinct Waste Generators, so the evidence has no generator',
    },
    {
      declaredWasteManagerIds: [],
      dropOffDate: undefined,
      evidence: (context) =>
        buildEvidence([])({ ...context, dropOffDate: DROP_OFF_DATE }),
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISMATCH(['dropOffDate']),
      resultStatus: 'FAILED',
      scenario: 'the evidence has a Drop-off the MassID does not have',
    },
    {
      declaredWasteManagerIds: [],
      dropOffDate: undefined,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, { source: 'connection' }),
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([FIRST_WASTE_MANAGER_ID, DECISION_REASONS.MISSING_DROP_OFF]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'an eligible connection without actor on a MassID without Drop-off',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID, {
          eligibility: 'ineligible',
          reason: 'connection-start-after-drop-off',
        }),
      ]),
      resultComment: RESULT_COMMENTS.reviewRequired.REVIEW(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITHOUT_ELIGIBLE_CONNECTION('ineligible'),
        ]),
      ),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'the declared Waste Manager has a confirmed connection the evidence marks ineligible',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: buildEvidence([
        confirmedEntry(FIRST_WASTE_MANAGER_ID),
        confirmedEntry(SECOND_WASTE_MANAGER_ID, {
          eligibility: 'ineligible',
          source: 'connection',
        }),
      ]),
      resultComment: RESULT_COMMENTS.passed.VERIFIED(
        summary([
          FIRST_WASTE_MANAGER_ID,
          DECISION_REASONS.DECLARED_WITH_CONFIRMED_CONNECTION(CONNECTION_START),
        ]),
      ),
      resultStatus: 'PASSED',
      scenario:
        'a declared Waste Manager is eligible and an ineligible connection is excluded',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: undefined,
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISSING,
      resultStatus: 'FAILED',
      scenario: 'the MassID has a Waste Manager and the evidence is missing',
    },
    {
      declaredWasteManagerIds: [],
      dropOffDate: DROP_OFF_DATE,
      evidence: undefined,
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISSING,
      resultStatus: 'FAILED',
      scenario: 'the MassID has no Waste Manager and the evidence is missing',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: () => MALFORMED_EVIDENCE,
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MALFORMED(
        describeSchemaIssues(MALFORMED_EVIDENCE),
      ),
      resultStatus: 'FAILED',
      scenario: 'the evidence breaks the contract',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: (context) =>
        buildEvidence([confirmedEntry(FIRST_WASTE_MANAGER_ID)])({
          ...context,
          dropOffDate: SAO_PAULO_MIDNIGHT,
          massId: faker.string.uuid(),
        }),
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISMATCH([
        'massId',
        'dropOffDate',
      ]),
      resultStatus: 'FAILED',
      scenario:
        'the evidence was prepared for another MassID and another Drop-off',
    },
    {
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: DROP_OFF_DATE,
      evidence: (context) =>
        buildEvidence([
          confirmedEntry(FIRST_WASTE_MANAGER_ID, { source: 'connection' }),
          confirmedEntry(SECOND_WASTE_MANAGER_ID),
        ])({
          ...context,
          documentId: faker.string.uuid(),
          generatorPalantirParticipantId: faker.string.uuid(),
        }),
      resultComment: RESULT_COMMENTS.failed.EVIDENCE_MISMATCH([
        'documentId',
        'generatorPalantirParticipantId',
        `wasteManagers[${FIRST_WASTE_MANAGER_ID}].source`,
        `wasteManagers[${SECOND_WASTE_MANAGER_ID}].source`,
      ]),
      resultStatus: 'FAILED',
      scenario:
        'the evidence disagrees with the MassID on document, generator and declared actors',
    },
  ];
