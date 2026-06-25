import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  type StubBoldDocumentParameters,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldBaseline,
  BoldDocumentEventName,
  MassIDActorType,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { addYears, getYear } from 'date-fns';

import { RESULT_COMMENTS } from './prevented-emissions.constants';
import { preventedEmissionsLambda } from './prevented-emissions.lambda';
import {
  preventedEmissionsErrorTestCases,
  preventedEmissionsTestCases,
} from './prevented-emissions.test-cases';

const {
  BASELINES,
  EXCEEDING_EMISSION_COEFFICIENT,
  GREENHOUSE_GAS_TYPE,
  LOCAL_WASTE_CLASSIFICATION_ID,
  REFERENCE_YEAR,
} = BoldAttributeName;
const { EMISSION_AND_COMPOSTING_METRICS, PICK_UP } = BoldDocumentEventName;
const { RECYCLER } = MassIDActorType;

describe('PreventedEmissionsProcessor E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(preventedEmissionsTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationDocuments,
      externalCreatedAt,
      massIDDocumentsParams,
      massIDDocumentValue,
      resultComment,
      resultStatus,
      subtype,
    }) => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder()
        .createMassIDDocuments({
          ...massIDDocumentsParams,
          partialDocument: {
            ...massIDDocumentsParams?.partialDocument,
            currentValue: massIDDocumentValue as number,
            externalCreatedAt,
            subtype,
          },
        })
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      prepareEnvironmentTestE2E(
        [
          massIDDocument,
          massIDAuditDocument,
          ...participantsAccreditationDocuments.values(),
        ].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await preventedEmissionsLambda(
        stubRuleInput({
          documentId: massIDAuditDocument.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response).toMatchObject({
        resultComment,
        resultStatus,
      });
    },
  );

  describe('PreventedEmissionsProcessorErrors', () => {
    it.each(preventedEmissionsErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({ documents, massIDAuditDocument, resultStatus }) => {
        prepareEnvironmentTestE2E(
          [...documents, massIDAuditDocument].map((document) => ({
            document,
            documentKey: toDocumentKey({
              documentId: document.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await preventedEmissionsLambda(
          stubRuleInput({
            documentId: massIDAuditDocument.id,
            documentKeyPrefix,
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

        expect(response.resultStatus).toBe(resultStatus);
      },
    );
  });

  describe('Others (if organic) terminal state and the review-required flag', () => {
    const wasteCode = '20 01 99';

    const runTier3Lambda = async (): Promise<RuleOutput> => {
      const accreditationDocuments = new Map<
        string,
        StubBoldDocumentParameters
      >([
        [
          RECYCLER,
          {
            externalEventsMap: {
              [EMISSION_AND_COMPOSTING_METRICS]:
                stubBoldEmissionAndCompostingMetricsEvent({
                  metadataAttributes: [
                    [EXCEEDING_EMISSION_COEFFICIENT, 0.02],
                    [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                    [REFERENCE_YEAR, getYear(new Date())],
                    [
                      BASELINES,
                      {
                        [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]:
                          BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
                      },
                    ],
                  ],
                }),
            },
          },
        ],
      ]);

      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: {
            [PICK_UP]: stubBoldMassIDPickUpEvent({
              metadataAttributes: [[LOCAL_WASTE_CLASSIFICATION_ID, wasteCode]],
              partialDocumentEvent: {
                externalCreatedAt: '2026-06-01T00:00:00.000Z',
              },
            }),
          },
          partialDocument: {
            externalCreatedAt: addYears(new Date(), 1).toISOString(),
            subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
          },
        })
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      prepareEnvironmentTestE2E(
        [
          massIDDocument,
          massIDAuditDocument,
          ...participantsAccreditationDocuments.values(),
        ].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      return (await preventedEmissionsLambda(
        stubRuleInput({
          documentId: massIDAuditDocument.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;
    };

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('reports FAILED with the no-fraction comment when the flag is off', async () => {
      const response = await runTier3Lambda();

      expect(response.resultStatus).toBe('FAILED');
      expect(response.resultComment).toBe(
        RESULT_COMMENTS.failed.OTHERS_IF_ORGANIC_NO_CARBON_FRACTION(wasteCode),
      );
    });

    it('reports FAILED (downgraded) with the awaiting-laudo comment when the flag is on', async () => {
      vi.stubEnv('ENABLE_REVIEW_REQUIRED', 'true');

      const response = await runTier3Lambda();

      // The lambda wrapper downgrades REVIEW_REQUIRED to FAILED for Smaug;
      // the differing comment proves the review-required path was taken.
      expect(response.resultStatus).toBe('FAILED');
      expect(response.resultComment).toBe(
        RESULT_COMMENTS.reviewRequired.OTHERS_IF_ORGANIC_AWAITING_LAUDO(
          wasteCode,
        ),
      );
    });
  });
});
