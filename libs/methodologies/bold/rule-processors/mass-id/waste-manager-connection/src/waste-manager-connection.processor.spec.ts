import {
  loadConnectionEvidence,
  loadDocument,
  type MassIDConnectionEvidenceLoadResult,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldDocumentEventLabel,
  BoldDocumentEventName,
  MassIDConnectionEvidenceSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  DECISION_REASONS,
  RESULT_COMMENTS,
} from './waste-manager-connection.constants';
import { WasteManagerConnectionProcessor } from './waste-manager-connection.processor';
import {
  buildEvidence,
  describeSchemaIssues,
  FIRST_WASTE_MANAGER_ID,
  POLICY_VERSION,
  SECOND_WASTE_MANAGER_ID,
  stubWasteManagerConnectionMassIDDocument,
  type WasteManagerConnectionTestCase,
  wasteManagerConnectionTestCases,
} from './waste-manager-connection.test-cases';

vi.mock(
  '@carrot-fndn/shared/methodologies/bold/io-helpers',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@carrot-fndn/shared/methodologies/bold/io-helpers')
    >()),
    loadConnectionEvidence: vi.fn(),
    loadDocument: vi.fn(),
  }),
);

const toLoadResult = (
  rawEvidence: unknown,
): MassIDConnectionEvidenceLoadResult => {
  if (rawEvidence === undefined) {
    return { status: 'missing' };
  }

  const parsed = MassIDConnectionEvidenceSchema.safeParse(rawEvidence);

  return parsed.success
    ? { evidence: parsed.data, status: 'found' }
    : { reason: describeSchemaIssues(rawEvidence), status: 'malformed' };
};

describe('WasteManagerConnectionProcessor', () => {
  const processor = new WasteManagerConnectionProcessor();

  const processScenario = async ({
    declaredWasteManagerIds,
    dropOffDate,
    evidence,
    extraExternalEvents,
    hasWasteGenerator,
  }: Pick<
    WasteManagerConnectionTestCase,
    | 'declaredWasteManagerIds'
    | 'dropOffDate'
    | 'evidence'
    | 'extraExternalEvents'
    | 'hasWasteGenerator'
  >) => {
    const ruleInput = stubRuleInput();
    const generatorPalantirParticipantId =
      hasWasteGenerator === false ? null : faker.string.uuid();
    const massIDDocument = stubWasteManagerConnectionMassIDDocument({
      declaredWasteManagerIds,
      dropOffDate,
      extraExternalEvents,
      generatorPalantirParticipantId,
    });

    vi.mocked(loadDocument).mockResolvedValueOnce(massIDDocument);
    vi.mocked(loadConnectionEvidence).mockResolvedValueOnce(
      toLoadResult(
        evidence?.({
          documentId: ruleInput.documentId,
          dropOffDate: dropOffDate ?? null,
          generatorPalantirParticipantId,
          massId: massIDDocument.id,
        }),
      ),
    );

    return { ruleInput, ruleOutput: await processor.process(ruleInput) };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(wasteManagerConnectionTestCases)(
    'should return $resultStatus when $scenario',
    async ({ resultComment, resultStatus, ...scenario }) => {
      const { ruleOutput } = await processScenario(scenario);

      expect(ruleOutput).toEqual(
        expect.objectContaining({ resultComment, resultStatus }),
      );
    },
  );

  it('should read the evidence next to the execution document', async () => {
    const { ruleInput } = await processScenario({
      declaredWasteManagerIds: [],
      dropOffDate: undefined,
      evidence: buildEvidence([]),
    });

    expect(loadConnectionEvidence).toHaveBeenCalledWith(
      `${ruleInput.documentKeyPrefix}/${ruleInput.documentId}.connection-evidence.json`,
    );
  });

  it('should fail without reading the evidence when the MassID cannot be loaded', async () => {
    const ruleInput = stubRuleInput();

    vi.mocked(loadDocument).mockResolvedValueOnce(undefined);

    const ruleOutput = await processor.process(ruleInput);

    expect(ruleOutput.resultStatus).toBe('FAILED');
    expect(loadConnectionEvidence).not.toHaveBeenCalled();
  });

  it('should treat a MassID without events as having no actors and no Drop-off', async () => {
    const ruleInput = stubRuleInput();
    const massIDDocument = {
      ...stubWasteManagerConnectionMassIDDocument({
        declaredWasteManagerIds: [],
        dropOffDate: undefined,
        generatorPalantirParticipantId: null,
      }),
      externalEvents: undefined,
    };

    vi.mocked(loadDocument).mockResolvedValueOnce(massIDDocument);
    vi.mocked(loadConnectionEvidence).mockResolvedValueOnce(
      toLoadResult(
        buildEvidence([])({
          documentId: ruleInput.documentId,
          dropOffDate: null,
          generatorPalantirParticipantId: null,
          massId: massIDDocument.id,
        }),
      ),
    );

    const ruleOutput = await processor.process(ruleInput);

    expect(ruleOutput).toEqual(
      expect.objectContaining({
        resultComment: RESULT_COMMENTS.passed.NOT_APPLICABLE,
        resultStatus: 'PASSED',
      }),
    );
  });

  it('should treat repeated Waste Generator events of one participant as one generator', async () => {
    const ruleInput = stubRuleInput();
    const generatorPalantirParticipantId = faker.string.uuid();
    const massIDDocument = stubWasteManagerConnectionMassIDDocument({
      declaredWasteManagerIds: [],
      dropOffDate: undefined,
      extraExternalEvents: [
        stubDocumentEvent({
          label: BoldDocumentEventLabel.WASTE_GENERATOR,
          name: BoldDocumentEventName.ACTOR,
          participant: { id: generatorPalantirParticipantId },
        }),
      ],
      generatorPalantirParticipantId,
    });

    vi.mocked(loadDocument).mockResolvedValueOnce(massIDDocument);
    vi.mocked(loadConnectionEvidence).mockResolvedValueOnce(
      toLoadResult(
        buildEvidence([])({
          documentId: ruleInput.documentId,
          dropOffDate: null,
          generatorPalantirParticipantId,
          massId: massIDDocument.id,
        }),
      ),
    );

    const ruleOutput = await processor.process(ruleInput);

    expect(ruleOutput.resultComment).toBe(
      RESULT_COMMENTS.passed.NOT_APPLICABLE,
    );
  });

  it('should word the Drop-off reason with the civil day before the connection start', () => {
    expect(
      DECISION_REASONS.DROP_OFF_BEFORE_CONNECTION_START(
        '2026-10-08',
        '2026-10-09',
      ),
    ).toBe(
      'the "Drop-off" day 2026-10-08 (America/Sao_Paulo) precedes the connection start 2026-10-09',
    );
  });

  it('should record a decision per Waste Manager in the result content', async () => {
    const excludedWasteManagerId = faker.string.uuid();
    const { ruleOutput } = await processScenario({
      declaredWasteManagerIds: [
        FIRST_WASTE_MANAGER_ID,
        SECOND_WASTE_MANAGER_ID,
      ],
      dropOffDate: '2026-10-09T15:00:00.000Z',
      evidence: buildEvidence([
        {
          confirmedStartDate: '2026-10-01',
          effectiveEndDate: null,
          eligibility: 'eligible',
          palantirParticipantId: FIRST_WASTE_MANAGER_ID,
          relationId: faker.string.uuid(),
          revision: 2,
          source: 'both',
        },
        {
          eligibility: 'review',
          palantirParticipantId: SECOND_WASTE_MANAGER_ID,
          source: 'integrator',
        },
        {
          confirmedStartDate: '2026-10-01',
          effectiveEndDate: null,
          eligibility: 'ineligible',
          palantirParticipantId: excludedWasteManagerId,
          relationId: faker.string.uuid(),
          revision: 1,
          source: 'connection',
        },
      ]),
    });

    expect(ruleOutput.resultContent).toEqual({
      connectionHistory: 'complete',
      policyVersion: POLICY_VERSION,
      wasteManagers: [
        {
          decision: 'approved',
          origin: 'declared',
          palantirParticipantId: FIRST_WASTE_MANAGER_ID,
          reason:
            DECISION_REASONS.DECLARED_WITH_CONFIRMED_CONNECTION('2026-10-01'),
        },
        {
          decision: 'review',
          origin: 'declared',
          palantirParticipantId: SECOND_WASTE_MANAGER_ID,
          reason:
            DECISION_REASONS.DECLARED_WITHOUT_ELIGIBLE_CONNECTION('review'),
        },
        {
          decision: 'excluded',
          origin: 'connection',
          palantirParticipantId: excludedWasteManagerId,
          reason: DECISION_REASONS.CONNECTION_INELIGIBLE,
        },
      ],
    });
  });

  it('should keep the per-manager decisions and the incomplete history in the result content', async () => {
    const { ruleOutput } = await processScenario({
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID],
      dropOffDate: '2026-10-09T15:00:00.000Z',
      evidence: (context) => ({
        ...buildEvidence([
          {
            confirmedStartDate: '2026-09-01',
            effectiveEndDate: '2026-10-09',
            eligibility: 'eligible',
            palantirParticipantId: FIRST_WASTE_MANAGER_ID,
            relationId: faker.string.uuid(),
            revision: 3,
            source: 'both',
          },
          {
            confirmedStartDate: '2026-10-09',
            effectiveEndDate: null,
            eligibility: 'eligible',
            palantirParticipantId: SECOND_WASTE_MANAGER_ID,
            relationId: faker.string.uuid(),
            revision: 1,
            source: 'connection',
          },
        ])(context),
        connectionHistory: 'incomplete',
      }),
    });

    expect(ruleOutput).toEqual(
      expect.objectContaining({
        resultContent: {
          connectionHistory: 'incomplete',
          policyVersion: POLICY_VERSION,
          wasteManagers: [
            {
              decision: 'review',
              origin: 'declared',
              palantirParticipantId: FIRST_WASTE_MANAGER_ID,
              reason: DECISION_REASONS.DROP_OFF_ON_OR_AFTER_CONNECTION_END(
                '2026-10-09',
                '2026-10-09',
              ),
            },
            {
              decision: 'approved',
              origin: 'connection',
              palantirParticipantId: SECOND_WASTE_MANAGER_ID,
              reason: DECISION_REASONS.DERIVED_BENEFICIARY('2026-10-09'),
            },
          ],
        },
        resultStatus: 'REVIEW_REQUIRED',
      }),
    );
  });

  it('should decide once for a Waste Manager declared in several actor events', async () => {
    const { ruleOutput } = await processScenario({
      declaredWasteManagerIds: [FIRST_WASTE_MANAGER_ID, FIRST_WASTE_MANAGER_ID],
      dropOffDate: '2026-10-09T15:00:00.000Z',
      evidence: buildEvidence([]),
    });

    expect(ruleOutput.resultComment).toBe(
      RESULT_COMMENTS.reviewRequired.REVIEW(
        `${FIRST_WASTE_MANAGER_ID} (${DECISION_REASONS.DECLARED_WITHOUT_CONNECTION_ENTRY})`,
      ),
    );
  });
});
