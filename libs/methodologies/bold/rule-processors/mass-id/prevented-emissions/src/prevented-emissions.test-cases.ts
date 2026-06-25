import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  BoldStubsBuilder,
  type MetadataAttributeParameter,
  type StubBoldDocumentParameters,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldMassIDPickUpEvent,
  stubBoldOrganicWasteCarbonCharacterizationEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldBaseline,
  BoldDocument,
  BoldDocumentEventName,
  MassIDActorType,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type AnyObject } from '@carrot-fndn/shared/types';
import { addYears } from 'date-fns';

import {
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON,
  RESULT_COMMENTS,
} from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  buildOthersIfOrganicAuditDetails,
  calculateOthersIfOrganicFactor,
} from './prevented-emissions.others-organic.helpers';

export interface PreventedEmissionsTestCase extends RuleTestCase {
  accreditationDocuments: Map<string, StubBoldDocumentParameters>;
  externalCreatedAt: string;
  massIDDocumentsParams?: StubBoldDocumentParameters;
  massIDDocumentValue?: number;
  resultContent: AnyObject | undefined;
  subtype: MassIDOrganicSubtype;
}

const {
  BASELINES,
  CARBON_ANALYSIS_DATE,
  CARBON_FRACTION,
  EXCEEDING_EMISSION_COEFFICIENT,
  GREENHOUSE_GAS_TYPE,
  LOCAL_WASTE_CLASSIFICATION_ID,
  MOISTURE_FRACTION,
} = BoldAttributeName;
const { RECYCLER, WASTE_GENERATOR } = MassIDActorType;
const {
  EMISSION_AND_COMPOSTING_METRICS,
  ORGANIC_WASTE_CARBON_CHARACTERIZATION,
  PICK_UP,
} = BoldDocumentEventName;

const subtype = MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES;
const baseline = BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS;
const exceedingEmissionCoefficient = 0.02;
const massIDDocumentValue = 100;
const baselineValue =
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[subtype][baseline];
const expectedPreventedEmissionsValue =
  massIDDocumentValue * (baselineValue - exceedingEmissionCoefficient);

const exceedingEmissionCoefficientExceedingBaseline = baselineValue + 1;

const othersIfOrganicLocalWasteClassificationCode = '02 01 06';
const othersIfOrganicCarbonFraction = '0.15';
const othersIfOrganicPickUpDate = '2026-06-01T00:00:00.000Z';

const computeOthersIfOrganicFactor = (baseline_: BoldBaseline): number => {
  if (baseline_ === BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS) {
    // Coefficients aligned with internal calculator, rounded to 6 decimals.
    return Number.parseFloat('0.905557');
  }

  if (baseline_ === BoldBaseline.OPEN_AIR_DUMP) {
    return Number.parseFloat('0.698505');
  }

  return Number.parseFloat('0.439691');
};

const getOthersIfOrganicFormulaCoeffs = (
  baseline_: BoldBaseline,
): { intercept: number; slope: number } => {
  if (baseline_ === BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS) {
    return {
      intercept: Number.parseFloat('-0.1297003'),
      slope: Number.parseFloat('6.901715'),
    };
  }

  if (baseline_ === BoldBaseline.OPEN_AIR_DUMP) {
    return {
      intercept: Number.parseFloat('-0.1297013'),
      slope: Number.parseFloat('5.521373'),
    };
  }

  return {
    intercept: Number.parseFloat('-0.129701'),
    slope: Number.parseFloat('3.795947'),
  };
};

const processorErrors = new PreventedEmissionsProcessorErrors();

const makeRecyclerAccreditationParameters = (
  metadataAttributes: MetadataAttributeParameter[],
): StubBoldDocumentParameters => ({
  externalEventsMap: {
    [EMISSION_AND_COMPOSTING_METRICS]:
      stubBoldEmissionAndCompostingMetricsEvent({ metadataAttributes }),
  },
});

const makeAccreditationDocuments = (
  recyclerMetadataAttributes: MetadataAttributeParameter[],
  wasteGeneratorCarbonCharacterizationAttributes?: MetadataAttributeParameter[],
): Map<string, StubBoldDocumentParameters> => {
  const accreditationDocuments = new Map<string, StubBoldDocumentParameters>([
    [RECYCLER, makeRecyclerAccreditationParameters(recyclerMetadataAttributes)],
  ]);

  if (wasteGeneratorCarbonCharacterizationAttributes) {
    accreditationDocuments.set(WASTE_GENERATOR, {
      externalEventsMap: {
        [ORGANIC_WASTE_CARBON_CHARACTERIZATION]:
          stubBoldOrganicWasteCarbonCharacterizationEvent({
            metadataAttributes: wasteGeneratorCarbonCharacterizationAttributes,
          }),
      },
    });
  }

  return accreditationDocuments;
};

const makeMassIdPickUpParametersWithLocalWasteClassificationCode = (
  localWasteClassificationCode: string | undefined,
  pickUpExternalCreatedAt?: string,
): StubBoldDocumentParameters => ({
  externalEventsMap: {
    [PICK_UP]: stubBoldMassIDPickUpEvent({
      ...(pickUpExternalCreatedAt && {
        partialDocumentEvent: { externalCreatedAt: pickUpExternalCreatedAt },
      }),
      metadataAttributes: [
        [LOCAL_WASTE_CLASSIFICATION_ID, localWasteClassificationCode],
      ],
    }),
  },
});

const {
  massIDAuditDocument,
  massIDDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIDDocuments({
    partialDocument: {
      externalCreatedAt: addYears(new Date(), 1).toISOString(),
    },
  })
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const preventedEmissionsTestCases: PreventedEmissionsTestCase[] = [
  {
    accreditationDocuments: makeAccreditationDocuments([
      [EXCEEDING_EMISSION_COEFFICIENT, undefined],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [subtype]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    resultComment:
      RESULT_COMMENTS.failed.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient: undefined,
        gasType: 'Methane (CH4)',
        massIDDocumentValue: 1,
        wasteSubtype: subtype,
      },
    },
    resultStatus: 'FAILED',
    scenario: 'The exceeding emission coefficient is undefined (missing)',
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments([
      [
        EXCEEDING_EMISSION_COEFFICIENT,
        exceedingEmissionCoefficientExceedingBaseline,
      ],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [subtype]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
      0,
      baselineValue,
      exceedingEmissionCoefficientExceedingBaseline,
      massIDDocumentValue,
    ),
    resultContent: {
      gasType: 'Methane (CH4)',
      preventedCo2e: 0,
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient:
          exceedingEmissionCoefficientExceedingBaseline,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteSubtype: subtype,
      },
    },
    resultStatus: 'PASSED',
    scenario:
      'The calculated prevented emissions would be negative, so they are clamped to zero',
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments([
      [EXCEEDING_EMISSION_COEFFICIENT, null],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [subtype]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    resultComment:
      RESULT_COMMENTS.failed.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient: null,
        gasType: 'Methane (CH4)',
        massIDDocumentValue: 1,
        wasteSubtype: subtype,
      },
    },
    resultStatus: 'FAILED',
    scenario: 'The exceeding emission coefficient is null (non-positive)',
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments([
      [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [subtype]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
      expectedPreventedEmissionsValue,
      baselineValue,
      exceedingEmissionCoefficient,
      massIDDocumentValue,
    ),
    resultContent: {
      gasType: 'Methane (CH4)',
      preventedCo2e: expectedPreventedEmissionsValue,
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteSubtype: subtype,
      },
    },
    resultStatus: 'PASSED',
    scenario: 'The calculation is correct with all required attributes',
    subtype,
  },
  ...[
    BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
    BoldBaseline.OPEN_AIR_DUMP,
    BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
  ].map((othersBaseline): PreventedEmissionsTestCase => {
    const othersFactor = computeOthersIfOrganicFactor(othersBaseline);
    const expectedOthersPreventedEmissions =
      massIDDocumentValue * othersFactor -
      massIDDocumentValue * exceedingEmissionCoefficient;

    const formulaCoeffs = getOthersIfOrganicFormulaCoeffs(othersBaseline);

    return {
      accreditationDocuments: makeAccreditationDocuments([
        [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        [
          BASELINES,
          { [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: othersBaseline },
        ],
      ]),
      externalCreatedAt: massIDDocument.externalCreatedAt,
      massIDDocumentsParams:
        makeMassIdPickUpParametersWithLocalWasteClassificationCode(
          othersIfOrganicLocalWasteClassificationCode,
          othersIfOrganicPickUpDate,
        ),
      massIDDocumentValue,
      resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
        expectedOthersPreventedEmissions,
        othersFactor,
        exceedingEmissionCoefficient,
        massIDDocumentValue,
      ),
      resultContent: {
        gasType: 'Methane (CH4)',
        othersIfOrganicAudit: {
          canonicalLocalWasteClassificationCode:
            othersIfOrganicLocalWasteClassificationCode,
          carbonFraction: othersIfOrganicCarbonFraction,
          computedFactor: othersFactor,
          formulaCoeffs,
          source: 'author',
        },
        preventedCo2e: expectedOthersPreventedEmissions,
        ruleSubject: {
          baseline: othersBaseline,
          exceedingEmissionCoefficient,
          gasType: 'Methane (CH4)',
          localWasteClassificationId:
            othersIfOrganicLocalWasteClassificationCode,
          massIDDocumentValue,
          normalizedLocalWasteClassificationId:
            othersIfOrganicLocalWasteClassificationCode,
          pickUpDate: othersIfOrganicPickUpDate,
          wasteSubtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
        },
      },
      resultStatus: 'PASSED',
      scenario: `Others (if organic) calculates factor dynamically for baseline "${othersBaseline}" and local waste classification "${othersIfOrganicLocalWasteClassificationCode}"`,
      subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
    };
  }),
  {
    accreditationDocuments: makeAccreditationDocuments([
      [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [subtype]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment:
      RESULT_COMMENTS.failed.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE(
        MassIDOrganicSubtype.DOMESTIC_SLUDGE,
      ),
    resultContent: {
      ruleSubject: {
        baseline: undefined,
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteSubtype: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
      },
    },
    resultStatus: 'FAILED',
    scenario: `The Recycler Accreditation document does not have the "${BASELINES}" info for the waste subtype "${MassIDOrganicSubtype.DOMESTIC_SLUDGE}"`,
    subtype: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
  },
  {
    accreditationDocuments: makeAccreditationDocuments([
      [EXCEEDING_EMISSION_COEFFICIENT, 0],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [subtype]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
      massIDDocumentValue * baselineValue,
      baselineValue,
      0,
      massIDDocumentValue,
    ),
    resultContent: {
      gasType: 'Methane (CH4)',
      preventedCo2e: massIDDocumentValue * baselineValue,
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient: 0,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteSubtype: subtype,
      },
    },
    resultStatus: 'PASSED',
    scenario:
      'The exceeding emission coefficient is zero (no exceeding emissions)',
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments([
      [EXCEEDING_EMISSION_COEFFICIENT, -0.5],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [subtype]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment:
      RESULT_COMMENTS.failed.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient: -0.5,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteSubtype: subtype,
      },
    },
    resultStatus: 'FAILED',
    scenario: 'The exceeding emission coefficient is negative',
    subtype,
  },
  // Tier 2 — valid generator carbon characterization.
  (() => {
    const generatorBaseline = BoldBaseline.OPEN_AIR_DUMP;
    const generatorCarbonFraction = '0.12';
    const generatorMoistureFraction = '0.65';
    const generatorAnalysisDate = '2026-05-01';
    const generatorWasteCode = '20 01 99';
    const generatorFactor = calculateOthersIfOrganicFactor(
      generatorBaseline,
      generatorCarbonFraction,
    );
    const generatorPreventedEmissions =
      massIDDocumentValue * generatorFactor -
      massIDDocumentValue * exceedingEmissionCoefficient;

    return {
      accreditationDocuments: makeAccreditationDocuments(
        [
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
          [
            BASELINES,
            { [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: generatorBaseline },
          ],
        ],
        [
          [LOCAL_WASTE_CLASSIFICATION_ID, generatorWasteCode],
          [CARBON_FRACTION, generatorCarbonFraction],
          [CARBON_ANALYSIS_DATE, generatorAnalysisDate],
          [MOISTURE_FRACTION, generatorMoistureFraction],
        ],
      ),
      externalCreatedAt: massIDDocument.externalCreatedAt,
      massIDDocumentsParams:
        makeMassIdPickUpParametersWithLocalWasteClassificationCode(
          generatorWasteCode,
          othersIfOrganicPickUpDate,
        ),
      massIDDocumentValue,
      resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
        generatorPreventedEmissions,
        generatorFactor,
        exceedingEmissionCoefficient,
        massIDDocumentValue,
      ),
      resultContent: {
        gasType: 'Methane (CH4)',
        othersIfOrganicAudit: {
          ...buildOthersIfOrganicAuditDetails(
            generatorWasteCode,
            generatorCarbonFraction,
            generatorBaseline,
          ),
          analysisDate: generatorAnalysisDate,
          moistureFraction: generatorMoistureFraction,
          source: 'generator',
        },
        preventedCo2e: generatorPreventedEmissions,
        ruleSubject: {
          baseline: generatorBaseline,
          exceedingEmissionCoefficient,
          gasType: 'Methane (CH4)',
          generatorCarbonAnalysisDate: generatorAnalysisDate,
          generatorCarbonFraction,
          generatorCarbonMoisture: generatorMoistureFraction,
          localWasteClassificationId: generatorWasteCode,
          massIDDocumentValue,
          normalizedLocalWasteClassificationId: generatorWasteCode,
          pickUpDate: othersIfOrganicPickUpDate,
          wasteSubtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
        },
      },
      resultStatus: 'PASSED',
      scenario:
        'Others (if organic) resolves via a valid generator carbon characterization',
      subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
    } satisfies PreventedEmissionsTestCase;
  })(),
  // Tier 3 — no author and no generator fraction → FAILED when the review flag is off.
  {
    accreditationDocuments: makeAccreditationDocuments([
      [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
      [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      [BASELINES, { [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline }],
    ]),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentsParams:
      makeMassIdPickUpParametersWithLocalWasteClassificationCode(
        '20 01 99',
        othersIfOrganicPickUpDate,
      ),
    massIDDocumentValue,
    resultComment:
      RESULT_COMMENTS.failed.OTHERS_IF_ORGANIC_NO_CARBON_FRACTION('20 01 99'),
    resultContent: {
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        localWasteClassificationId: '20 01 99',
        massIDDocumentValue,
        normalizedLocalWasteClassificationId: '20 01 99',
        pickUpDate: othersIfOrganicPickUpDate,
        wasteSubtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
      },
    },
    resultStatus: 'FAILED',
    scenario:
      'Others (if organic) with no author/generator fraction fails when the review flag is off',
    subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
  },
  // Tier 2 expired — generator fraction older than 2 years → FAILED when the review flag is off.
  {
    accreditationDocuments: makeAccreditationDocuments(
      [
        [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        [BASELINES, { [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline }],
      ],
      [
        [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2023-05-01'],
        [MOISTURE_FRACTION, '0.65'],
      ],
    ),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentsParams:
      makeMassIdPickUpParametersWithLocalWasteClassificationCode(
        '20 01 99',
        '2026-05-02T00:00:00.000Z',
      ),
    massIDDocumentValue,
    resultComment:
      RESULT_COMMENTS.failed.OTHERS_IF_ORGANIC_NO_CARBON_FRACTION('20 01 99'),
    resultContent: {
      ruleSubject: {
        baseline,
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        generatorCarbonAnalysisDate: '2023-05-01',
        generatorCarbonFraction: '0.12',
        generatorCarbonMoisture: '0.65',
        localWasteClassificationId: '20 01 99',
        massIDDocumentValue,
        normalizedLocalWasteClassificationId: '20 01 99',
        pickUpDate: '2026-05-02T00:00:00.000Z',
        wasteSubtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
      },
    },
    resultStatus: 'FAILED',
    scenario:
      'Others (if organic) with an expired generator fraction fails when the review flag is off',
    subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
  },
];

const mapParticipantAccreditationDocuments = ({
  excludeActorTypes = [],
  recyclerExternalEvents,
  recyclerRemoveEventName,
}: {
  excludeActorTypes?: string[];
  recyclerExternalEvents?: BoldDocument['externalEvents'];
  recyclerRemoveEventName?: string;
}): BoldDocument[] =>
  [...participantsAccreditationDocuments.values()]
    .filter(
      (document) =>
        document.subtype === undefined ||
        !excludeActorTypes.includes(document.subtype),
    )
    .map((document) => {
      if (document.subtype === RECYCLER && recyclerExternalEvents) {
        return {
          ...document,
          externalEvents:
            recyclerRemoveEventName === undefined
              ? recyclerExternalEvents
              : [
                  ...(document.externalEvents?.filter(
                    (event) => event.name !== recyclerRemoveEventName,
                  ) ?? []),
                  ...recyclerExternalEvents,
                ],
        };
      }

      return document;
    });

const makeRecyclerEmissionAndCompostingMetricsEvents = (
  metadataAttributes: MetadataAttributeParameter[],
): BoldDocument['externalEvents'] => [
  stubBoldEmissionAndCompostingMetricsEvent({ metadataAttributes }),
];

interface PreventedEmissionsErrorTestCase extends RuleTestCase {
  documents: BoldDocument[];
  massIDAuditDocument: BoldDocument;
}

export const preventedEmissionsErrorTestCases: PreventedEmissionsErrorTestCase[] =
  [
    {
      documents: [
        {
          ...massIDDocument,
          subtype: 'INVALID_SUBTYPE' as MassIDOrganicSubtype,
        },
        ...mapParticipantAccreditationDocuments({
          recyclerExternalEvents:
            makeRecyclerEmissionAndCompostingMetricsEvents([
              [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
              [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
              [BASELINES, { [subtype]: baseline }],
            ]),
        }),
      ],
      massIDAuditDocument,
      resultComment:
        processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
      resultStatus: 'FAILED',
      scenario: 'The MassID document has an invalid subtype',
    },
    {
      documents: [
        massIDDocument,
        ...mapParticipantAccreditationDocuments({
          recyclerExternalEvents:
            makeRecyclerEmissionAndCompostingMetricsEvents([
              [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
            ]),
          recyclerRemoveEventName: EMISSION_AND_COMPOSTING_METRICS.toString(),
        }),
      ],
      massIDAuditDocument,
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
      resultStatus: 'FAILED',
      scenario:
        'The Recycler Accreditation document does not have the Greenhouse Gas Type (GHG) attribute',
    },
    {
      documents: [...participantsAccreditationDocuments.values()],
      massIDAuditDocument,
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
      resultStatus: 'FAILED',
      scenario: 'The MassID document was not found',
    },
    {
      documents: [massIDDocument],
      massIDAuditDocument,
      resultComment:
        processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
      resultStatus: 'FAILED',
      scenario: 'The Recycler accreditation document was not found',
    },
    {
      documents: [
        massIDDocument,
        ...mapParticipantAccreditationDocuments({
          recyclerExternalEvents:
            makeRecyclerEmissionAndCompostingMetricsEvents([
              [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
              [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
              [BASELINES, undefined],
            ]),
        }),
      ],
      massIDAuditDocument,
      resultComment: processorErrors.ERROR_MESSAGE.INVALID_BASELINES,
      resultStatus: 'FAILED',
      scenario: 'The Recycler Accreditation document has no valid baselines',
    },
    {
      documents: [
        {
          ...massIDDocument,
          externalEvents: [
            ...(massIDDocument.externalEvents?.filter(
              (event) => event.name !== PICK_UP.toString(),
            ) ?? []),
            stubBoldMassIDPickUpEvent({
              metadataAttributes: [[LOCAL_WASTE_CLASSIFICATION_ID, undefined]],
            }),
          ],
          subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
        },
        ...mapParticipantAccreditationDocuments({
          recyclerExternalEvents:
            makeRecyclerEmissionAndCompostingMetricsEvents([
              [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
              [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
              [
                BASELINES,
                { [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline },
              ],
            ]),
        }),
      ],
      massIDAuditDocument,
      resultComment: processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID,
      resultStatus: 'FAILED',
      scenario:
        'The Others (if organic) does not provide Local Waste Classification ID on PICK_UP',
    },
    {
      documents: [
        {
          ...massIDDocument,
          externalEvents: [
            ...(massIDDocument.externalEvents?.filter(
              (event) => event.name !== PICK_UP.toString(),
            ) ?? []),
            stubBoldMassIDPickUpEvent({
              metadataAttributes: [[LOCAL_WASTE_CLASSIFICATION_ID, '00 00 00']],
            }),
          ],
          subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
        },
        ...mapParticipantAccreditationDocuments({
          recyclerExternalEvents:
            makeRecyclerEmissionAndCompostingMetricsEvents([
              [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
              [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
              [
                BASELINES,
                { [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline },
              ],
            ]),
        }),
      ],
      massIDAuditDocument,
      resultComment: processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID,
      resultStatus: 'FAILED',
      scenario:
        'Others (if organic) has an unknown Local Waste Classification ID (not an accepted local waste classification code (Ibama, Brazil))',
    },
  ];
