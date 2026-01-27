import {
  BoldStubsBuilder,
  type MetadataAttributeParameter,
  type StubBoldDocumentParameters,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldMassIDPickUpEvent,
  stubBoldRecyclingBaselinesEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  Document,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDDocumentActorType,
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { type AnyObject } from '@carrot-fndn/shared/types';
import { addYears } from 'date-fns';

import { PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import { RESULT_COMMENTS } from './prevented-emissions.processor';

export interface PreventedEmissionsTestCase {
  accreditationDocuments: Map<string, StubBoldDocumentParameters>;
  externalCreatedAt: string;
  massIDDocumentsParams?: StubBoldDocumentParameters;
  massIDDocumentValue?: number;
  resultComment: string;
  resultContent: AnyObject | undefined;
  resultStatus: RuleOutputStatus;
  scenario: string;
  subtype: MassIDOrganicSubtype;
}

const {
  BASELINES,
  EXCEEDING_EMISSION_COEFFICIENT,
  GREENHOUSE_GAS_TYPE,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;
const { RECYCLER, WASTE_GENERATOR } = MassIDDocumentActorType;
const { EMISSION_AND_COMPOSTING_METRICS, PICK_UP, RECYCLING_BASELINES } =
  DocumentEventName;

const subtype = MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES;
const baseline = MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS;
const exceedingEmissionCoefficient = 0.02;
const massIDDocumentValue = 100;
const baselineValue =
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[subtype][baseline];
const expectedPreventedEmissionsValue =
  massIDDocumentValue * (baselineValue - exceedingEmissionCoefficient);

const exceedingEmissionCoefficientExceedingBaseline = baselineValue + 1;

const othersIfOrganicLocalWasteClassificationCode = '02 01 06';
const othersIfOrganicCarbonFraction = '0.15';

const computeOthersIfOrganicFactor = (
  baseline_: MethodologyBaseline,
): number => {
  if (
    baseline_ === MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS
  ) {
    // Coefficients aligned with internal calculator, rounded to 6 decimals.
    return Number.parseFloat('0.905557');
  }

  if (baseline_ === MethodologyBaseline.OPEN_AIR_DUMP) {
    return Number.parseFloat('0.698505');
  }

  return Number.parseFloat('0.439691');
};

const getOthersIfOrganicFormulaCoeffs = (
  baseline_: MethodologyBaseline,
): { intercept: number; slope: number } => {
  if (
    baseline_ === MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS
  ) {
    return {
      intercept: Number.parseFloat('-0.1297003'),
      slope: Number.parseFloat('6.901715'),
    };
  }

  if (baseline_ === MethodologyBaseline.OPEN_AIR_DUMP) {
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

const makeWasteGeneratorAccreditationParameters = (
  baselinesValue: Record<string, MethodologyBaseline> | undefined,
): StubBoldDocumentParameters => ({
  externalEventsMap: {
    [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
      metadataAttributes: [[BASELINES, baselinesValue]],
    }),
  },
});

const makeAccreditationDocuments = ({
  recyclerMetadataAttributes,
  wasteGeneratorBaselinesValue,
}: {
  recyclerMetadataAttributes: MetadataAttributeParameter[];
  wasteGeneratorBaselinesValue: Record<string, MethodologyBaseline> | undefined;
}): Map<string, StubBoldDocumentParameters> =>
  new Map([
    [RECYCLER, makeRecyclerAccreditationParameters(recyclerMetadataAttributes)],
    [
      WASTE_GENERATOR,
      makeWasteGeneratorAccreditationParameters(wasteGeneratorBaselinesValue),
    ],
  ]);

const makeMassIdPickUpParametersWithLocalWasteClassificationCode = (
  localWasteClassificationCode: string | undefined,
): StubBoldDocumentParameters => ({
  externalEventsMap: {
    [PICK_UP]: stubBoldMassIDPickUpEvent({
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

export const preventedEmissionsTestCases = [
  {
    accreditationDocuments: makeAccreditationDocuments({
      recyclerMetadataAttributes: [
        [EXCEEDING_EMISSION_COEFFICIENT, undefined],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      ],
      wasteGeneratorBaselinesValue: { [subtype]: baseline },
    }),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: undefined,
        gasType: 'Methane (CH4)',
        massIDDocumentValue: 1,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the exceeding emission coefficient is undefined (missing)`,
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments({
      recyclerMetadataAttributes: [
        [
          EXCEEDING_EMISSION_COEFFICIENT,
          exceedingEmissionCoefficientExceedingBaseline,
        ],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      ],
      wasteGeneratorBaselinesValue: { [subtype]: baseline },
    }),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.PASSED(
      0,
      baselineValue,
      exceedingEmissionCoefficientExceedingBaseline,
      massIDDocumentValue,
    ),
    resultContent: {
      gasType: 'Methane (CH4)',
      preventedCo2e: 0,
      ruleSubject: {
        exceedingEmissionCoefficient:
          exceedingEmissionCoefficientExceedingBaseline,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the calculated prevented emissions would be negative, so they are clamped to zero',
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments({
      recyclerMetadataAttributes: [
        [EXCEEDING_EMISSION_COEFFICIENT, null],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      ],
      wasteGeneratorBaselinesValue: { [subtype]: baseline },
    }),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: null,
        gasType: 'Methane (CH4)',
        massIDDocumentValue: 1,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the exceeding emission coefficient is null (non-positive)`,
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments({
      recyclerMetadataAttributes: [
        [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      ],
      wasteGeneratorBaselinesValue: { [subtype]: baseline },
    }),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.PASSED(
      expectedPreventedEmissionsValue,
      baselineValue,
      exceedingEmissionCoefficient,
      massIDDocumentValue,
    ),
    resultContent: {
      gasType: 'Methane (CH4)',
      preventedCo2e: expectedPreventedEmissionsValue,
      ruleSubject: {
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the calculation is correct with all required attributes`,
    subtype,
  },
  ...[
    MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
    MethodologyBaseline.OPEN_AIR_DUMP,
    MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
  ].map((othersBaseline) => {
    const othersFactor = computeOthersIfOrganicFactor(othersBaseline);
    const expectedOthersPreventedEmissions =
      massIDDocumentValue * othersFactor -
      massIDDocumentValue * exceedingEmissionCoefficient;

    const formulaCoeffs = getOthersIfOrganicFormulaCoeffs(othersBaseline);

    return {
      accreditationDocuments: makeAccreditationDocuments({
        recyclerMetadataAttributes: [
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ],
        wasteGeneratorBaselinesValue: {
          [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: othersBaseline,
        },
      }),
      externalCreatedAt: massIDDocument.externalCreatedAt,
      massIDDocumentsParams:
        makeMassIdPickUpParametersWithLocalWasteClassificationCode(
          othersIfOrganicLocalWasteClassificationCode,
        ),
      massIDDocumentValue,
      resultComment: RESULT_COMMENTS.PASSED(
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
        },
        preventedCo2e: expectedOthersPreventedEmissions,
        ruleSubject: {
          exceedingEmissionCoefficient,
          gasType: 'Methane (CH4)',
          localWasteClassificationId:
            othersIfOrganicLocalWasteClassificationCode,
          massIDDocumentValue,
          normalizedLocalWasteClassificationId:
            othersIfOrganicLocalWasteClassificationCode,
          wasteGeneratorBaseline: othersBaseline,
          wasteSubtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
        },
      },
      resultStatus: RuleOutputStatus.PASSED,
      scenario: `Others (if organic) calculates factor dynamically for baseline "${othersBaseline}" and local waste classification "${othersIfOrganicLocalWasteClassificationCode}"`,
      subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
    };
  }),
  {
    accreditationDocuments: makeAccreditationDocuments({
      recyclerMetadataAttributes: [
        [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      ],
      wasteGeneratorBaselinesValue: { [subtype]: baseline },
    }),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE(
      MassIDOrganicSubtype.DOMESTIC_SLUDGE,
    ),
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteGeneratorBaseline: undefined,
        wasteSubtype: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the Waste Generator verification document does not have the "${BASELINES}" info for the waste subtype "${MassIDOrganicSubtype.DOMESTIC_SLUDGE}"`,
    subtype: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
  },
  {
    accreditationDocuments: makeAccreditationDocuments({
      recyclerMetadataAttributes: [
        [EXCEEDING_EMISSION_COEFFICIENT, 0],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      ],
      wasteGeneratorBaselinesValue: { [subtype]: baseline },
    }),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: 0,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the exceeding emission coefficient is zero (non-positive)`,
    subtype,
  },
  {
    accreditationDocuments: makeAccreditationDocuments({
      recyclerMetadataAttributes: [
        [EXCEEDING_EMISSION_COEFFICIENT, -0.5],
        [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
      ],
      wasteGeneratorBaselinesValue: { [subtype]: baseline },
    }),
    externalCreatedAt: massIDDocument.externalCreatedAt,
    massIDDocumentValue,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: -0.5,
        gasType: 'Methane (CH4)',
        massIDDocumentValue,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the exceeding emission coefficient is negative`,
    subtype,
  },
];

const wasteGeneratorVerificationDocument =
  participantsAccreditationDocuments.get(WASTE_GENERATOR) as Document;

const mapParticipantAccreditationDocuments = ({
  excludeActorTypes = [],
  recyclerExternalEvents,
  recyclerRemoveEventName,
  wasteGeneratorExternalEvents,
  wasteGeneratorRemoveEventName,
}: {
  excludeActorTypes?: string[];
  recyclerExternalEvents?: Document['externalEvents'];
  recyclerRemoveEventName?: string;
  wasteGeneratorExternalEvents?: Document['externalEvents'];
  wasteGeneratorRemoveEventName?: string;
}): Document[] =>
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

      if (
        document.subtype === WASTE_GENERATOR &&
        wasteGeneratorExternalEvents
      ) {
        return {
          ...document,
          externalEvents:
            wasteGeneratorRemoveEventName === undefined
              ? wasteGeneratorExternalEvents
              : [
                  ...(document.externalEvents?.filter(
                    (event) => event.name !== wasteGeneratorRemoveEventName,
                  ) ?? []),
                  ...wasteGeneratorExternalEvents,
                ],
        };
      }

      return document;
    });

const makeRecyclerEmissionAndCompostingMetricsEvents = (
  metadataAttributes: MetadataAttributeParameter[],
): Document['externalEvents'] => [
  stubBoldEmissionAndCompostingMetricsEvent({ metadataAttributes }),
];

const makeWasteGeneratorRecyclingBaselinesEvents = (
  baselinesValue: Record<string, MethodologyBaseline> | undefined,
): Document['externalEvents'] => [
  stubBoldRecyclingBaselinesEvent({
    metadataAttributes: [[BASELINES, baselinesValue]],
  }),
];

export const preventedEmissionsErrorTestCases = [
  {
    documents: [
      {
        ...massIDDocument,
        subtype: 'INVALID_SUBTYPE' as MassIDOrganicSubtype,
      },
      ...mapParticipantAccreditationDocuments({
        recyclerExternalEvents: makeRecyclerEmissionAndCompostingMetricsEvents([
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ]),
        wasteGeneratorExternalEvents:
          makeWasteGeneratorRecyclingBaselinesEvents({
            [subtype]: baseline,
          }),
        wasteGeneratorRemoveEventName: RECYCLING_BASELINES.toString(),
      }),
    ],
    massIDAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document has an invalid subtype',
  },
  {
    documents: [
      massIDDocument,
      ...mapParticipantAccreditationDocuments({
        recyclerExternalEvents: makeRecyclerEmissionAndCompostingMetricsEvents([
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
        ]),
        recyclerRemoveEventName: EMISSION_AND_COMPOSTING_METRICS.toString(),
      }),
    ],
    massIDAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the Recycler Accreditation document does not have the Greenhouse Gas Type (GHG) attribute',
  },
  {
    documents: [...participantsAccreditationDocuments.values()],
    massIDAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document was not found',
  },
  {
    documents: [massIDDocument],
    massIDAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the Recycler accreditation document was not found',
  },
  {
    documents: [
      massIDDocument,
      ...mapParticipantAccreditationDocuments({
        excludeActorTypes: [WASTE_GENERATOR],
        recyclerExternalEvents: makeRecyclerEmissionAndCompostingMetricsEvents([
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ]),
        recyclerRemoveEventName: EMISSION_AND_COMPOSTING_METRICS.toString(),
      }),
    ],
    massIDAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE
        .MISSING_WASTE_GENERATOR_VERIFICATION_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the Waste Generator Accreditation document was not found',
  },
  {
    documents: [
      massIDDocument,
      ...mapParticipantAccreditationDocuments({
        excludeActorTypes: [WASTE_GENERATOR],
        recyclerExternalEvents: makeRecyclerEmissionAndCompostingMetricsEvents([
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ]),
      }),
      {
        ...wasteGeneratorVerificationDocument,
        externalEvents: [
          stubBoldRecyclingBaselinesEvent({
            metadataAttributes: [[BASELINES, undefined]],
          }),
        ],
      },
    ],
    massIDAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the Waste Generator Accreditation document has no valid baselines',
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
        recyclerExternalEvents: makeRecyclerEmissionAndCompostingMetricsEvents([
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ]),
        wasteGeneratorExternalEvents:
          makeWasteGeneratorRecyclingBaselinesEvents({
            [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline,
          }),
        wasteGeneratorRemoveEventName: RECYCLING_BASELINES.toString(),
      }),
    ],
    massIDAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'Others (if organic) does not provide Local Waste Classification ID on PICK_UP',
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
        recyclerExternalEvents: makeRecyclerEmissionAndCompostingMetricsEvents([
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ]),
        wasteGeneratorExternalEvents:
          makeWasteGeneratorRecyclingBaselinesEvents({
            [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline,
          }),
        wasteGeneratorRemoveEventName: RECYCLING_BASELINES.toString(),
      }),
    ],
    massIDAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'Others (if organic) has an unknown Local Waste Classification ID (not an accepted local waste classification code (Ibama, Brazil))',
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
            metadataAttributes: [[LOCAL_WASTE_CLASSIFICATION_ID, '02 02 99']],
          }),
        ],
        subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
      },
      ...mapParticipantAccreditationDocuments({
        recyclerExternalEvents: makeRecyclerEmissionAndCompostingMetricsEvents([
          [EXCEEDING_EMISSION_COEFFICIENT, exceedingEmissionCoefficient],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ]),
        wasteGeneratorExternalEvents:
          makeWasteGeneratorRecyclingBaselinesEvents({
            [MassIDOrganicSubtype.OTHERS_IF_ORGANIC]: baseline,
          }),
        wasteGeneratorRemoveEventName: RECYCLING_BASELINES.toString(),
      }),
    ],
    massIDAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_CARBON_FRACTION_FOR_LOCAL_WASTE_CLASSIFICATION_CODE(
        '02 02 99',
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'Others (if organic) has a valid 8.7D local waste classification code (Ibama, Brazil) but carbon fraction is not configured',
  },
];
