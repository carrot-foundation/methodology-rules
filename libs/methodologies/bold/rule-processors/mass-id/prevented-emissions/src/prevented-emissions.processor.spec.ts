import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  createRuleTestFixture,
  expectRuleOutput,
  type MetadataAttributeParameter,
  type StubBoldDocumentParameters,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldMassIDPickUpEvent,
  stubBoldOrganicWasteCarbonCharacterizationEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldBaseline,
  BoldDocumentEventName,
  MassIDActorType,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';
import { type AnyObject } from '@carrot-fndn/shared/types';
import { addYears, getYear } from 'date-fns';

import { RESULT_COMMENTS } from './prevented-emissions.constants';
import { PreventedEmissionsProcessor } from './prevented-emissions.processor';
import {
  preventedEmissionsErrorTestCases,
  preventedEmissionsTestCases,
} from './prevented-emissions.test-cases';

const {
  BASELINES,
  CARBON_ANALYSIS_DATE,
  CARBON_FRACTION,
  EXCEEDING_EMISSION_COEFFICIENT,
  GREENHOUSE_GAS_TYPE,
  LOCAL_WASTE_CLASSIFICATION_ID,
  MOISTURE_FRACTION,
  REFERENCE_YEAR,
} = BoldAttributeName;
const { EMISSION_AND_COMPOSTING_METRICS, PICK_UP } = BoldDocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MassIDActorType;

const makeMassIDDocumentsParameters = (
  localWasteClassificationCode: string,
  pickUpCreatedAt: string,
): StubBoldDocumentParameters => ({
  externalEventsMap: {
    [PICK_UP]: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        [LOCAL_WASTE_CLASSIFICATION_ID, localWasteClassificationCode],
      ],
      partialDocumentEvent: { externalCreatedAt: pickUpCreatedAt },
    }),
  },
});

describe('PreventedEmissionsProcessor', () => {
  const ruleDataProcessor = new PreventedEmissionsProcessor();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('PreventedEmissionsProcessor', () => {
    it.each(preventedEmissionsTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        accreditationDocuments,
        externalCreatedAt,
        massIDDocumentsParams,
        massIDDocumentValue,
        resultComment,
        resultContent,
        resultStatus,
        subtype,
      }) => {
        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          accreditationDocuments,
          massIDDocumentsParams: {
            ...massIDDocumentsParams,
            partialDocument: {
              ...massIDDocumentsParams?.partialDocument,
              currentValue: massIDDocumentValue as number,
              externalCreatedAt,
              subtype,
            },
          },
          ruleDataProcessor,
          spyOnDocumentQueryServiceLoad,
        });

        expectRuleOutput({
          resultComment,
          resultContent,
          resultStatus,
          ruleInput,
          ruleOutput,
        });
      },
    );
  });

  describe('PreventedEmissionsProcessorErrors', () => {
    it.each(preventedEmissionsErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIDAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIDAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

        const ruleInput = stubRuleInput({
          documentId: massIDAuditDocument.id,
        });

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(ruleOutput).toEqual({
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultStatus,
        });
      },
    );
  });

  describe('Others (if organic) tiered resolution', () => {
    const baseline = BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS;
    const exceedingEmissionCoefficient = 0.02;
    const othersDocumentValue = 100;
    // MassID is created in (current year + 1); the recycler's metrics event is
    // tagged for the current year so it resolves as the "last year" event.
    const massIDCreatedAt = addYears(new Date(), 1).toISOString();
    const referenceYear = getYear(new Date());

    const makeAccreditationDocuments = (
      carbonCharacterizationAttributes?: MetadataAttributeParameter[],
    ): Map<string, StubBoldDocumentParameters> => {
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
                    [
                      EXCEEDING_EMISSION_COEFFICIENT,
                      exceedingEmissionCoefficient,
                    ],
                    [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                    [REFERENCE_YEAR, referenceYear],
                    [
                      BASELINES,
                      { [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline },
                    ],
                  ],
                }),
            },
          },
        ],
      ]);

      if (carbonCharacterizationAttributes) {
        accreditationDocuments.set(WASTE_GENERATOR, {
          externalEventsMap: {
            [BoldDocumentEventName.ORGANIC_WASTE_CARBON_CHARACTERIZATION]:
              stubBoldOrganicWasteCarbonCharacterizationEvent({
                metadataAttributes: carbonCharacterizationAttributes,
              }),
          },
        });
      }

      return accreditationDocuments;
    };

    const runOthersCase = async ({
      accreditationDocuments,
      massIDDocumentsParams,
    }: {
      accreditationDocuments: Map<string, StubBoldDocumentParameters>;
      massIDDocumentsParams: StubBoldDocumentParameters;
    }) => {
      const { ruleOutput } = await createRuleTestFixture({
        accreditationDocuments,
        massIDDocumentsParams: {
          ...massIDDocumentsParams,
          partialDocument: {
            currentValue: othersDocumentValue,
            externalCreatedAt: massIDCreatedAt,
            subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
          },
        },
        ruleDataProcessor,
        spyOnDocumentQueryServiceLoad,
      });

      return ruleOutput;
    };

    it('PASSES via author-defined code with source "author"', async () => {
      const ruleOutput = await runOthersCase({
        accreditationDocuments: makeAccreditationDocuments(),
        massIDDocumentsParams: makeMassIDDocumentsParameters(
          '02 01 06',
          '2026-06-01T00:00:00.000Z',
        ),
      });

      expect(ruleOutput.resultStatus).toBe('PASSED');
      expect(
        (ruleOutput.resultContent as AnyObject)['othersIfOrganicAudit'],
      ).toMatchObject({ source: 'author' });
    });

    it('uses the MassID created date as the pick-up date when no pick-up event exists', async () => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder()
        .createMassIDDocuments({
          partialDocument: {
            currentValue: othersDocumentValue,
            externalCreatedAt: massIDCreatedAt,
            subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
          },
        })
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(makeAccreditationDocuments())
        .build();

      const massIDDocumentWithoutPickUp = {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.name !== PICK_UP.toString(),
        ),
      };

      spyOnDocumentQueryServiceLoad(massIDAuditDocument, [
        massIDDocumentWithoutPickUp,
        massIDAuditDocument,
        ...participantsAccreditationDocuments.values(),
      ]);

      const ruleOutput = await ruleDataProcessor.process(
        stubRuleInput({ documentId: massIDAuditDocument.id }),
      );

      // Without a Local Waste Classification ID the resolver rejects the
      // classification, but the pick-up-date fallback path is still exercised.
      expect(ruleOutput.resultStatus).toBe('FAILED');
    });

    it('PASSES via a valid generator characterization with source "generator"', async () => {
      const ruleOutput = await runOthersCase({
        accreditationDocuments: makeAccreditationDocuments([
          [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
          [CARBON_FRACTION, '0.12'],
          [CARBON_ANALYSIS_DATE, '2026-05-01'],
          [MOISTURE_FRACTION, '0.65'],
        ]),
        massIDDocumentsParams: makeMassIDDocumentsParameters(
          '20 01 99',
          '2026-06-01T00:00:00.000Z',
        ),
      });

      expect(ruleOutput.resultStatus).toBe('PASSED');
      expect(
        (ruleOutput.resultContent as AnyObject)['othersIfOrganicAudit'],
      ).toMatchObject({
        analysisDate: '2026-05-01',
        moistureFraction: '0.65',
        source: 'generator',
      });
    });

    it('returns FAILED when no fraction and ENABLE_REVIEW_REQUIRED is off', async () => {
      const ruleOutput = await runOthersCase({
        accreditationDocuments: makeAccreditationDocuments(),
        massIDDocumentsParams: makeMassIDDocumentsParameters(
          '20 01 99',
          '2026-06-01T00:00:00.000Z',
        ),
      });

      expect(ruleOutput.resultStatus).toBe('FAILED');
      expect(ruleOutput.resultComment).toBe(
        RESULT_COMMENTS.failed.OTHERS_IF_ORGANIC_NO_CARBON_FRACTION('20 01 99'),
      );
    });

    describe('when ENABLE_REVIEW_REQUIRED is enabled', () => {
      beforeEach(() => {
        vi.stubEnv('ENABLE_REVIEW_REQUIRED', 'true');
      });

      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('returns REVIEW_REQUIRED when no fraction', async () => {
        const ruleOutput = await runOthersCase({
          accreditationDocuments: makeAccreditationDocuments(),
          massIDDocumentsParams: makeMassIDDocumentsParameters(
            '20 01 99',
            '2026-06-01T00:00:00.000Z',
          ),
        });

        expect(ruleOutput.resultStatus).toBe('REVIEW_REQUIRED');
        expect(ruleOutput.resultComment).toBe(
          RESULT_COMMENTS.reviewRequired.OTHERS_IF_ORGANIC_AWAITING_LAUDO(
            '20 01 99',
          ),
        );
      });

      it('returns REVIEW_REQUIRED with the expired comment when the fraction is stale', async () => {
        const ruleOutput = await runOthersCase({
          accreditationDocuments: makeAccreditationDocuments([
            [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
            [CARBON_FRACTION, '0.12'],
            [CARBON_ANALYSIS_DATE, '2023-05-01'],
            [MOISTURE_FRACTION, '0.65'],
          ]),
          massIDDocumentsParams: makeMassIDDocumentsParameters(
            '20 01 99',
            '2026-05-02T00:00:00.000Z',
          ),
        });

        expect(ruleOutput.resultStatus).toBe('REVIEW_REQUIRED');
        expect(ruleOutput.resultComment).toBe(
          RESULT_COMMENTS.reviewRequired.OTHERS_IF_ORGANIC_EXPIRED_FRACTION(
            '20 01 99',
            '2023-05-01',
            '2026-05-02T00:00:00.000Z',
          ),
        );
      });
    });
  });
});
