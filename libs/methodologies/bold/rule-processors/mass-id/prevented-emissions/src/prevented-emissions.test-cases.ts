import {
  BoldStubsBuilder,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldRecyclingBaselinesEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  Document,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { addYears } from 'date-fns';

import { PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import { formatNumber } from './prevented-emissions.helpers';
import { RESULT_COMMENTS } from './prevented-emissions.processor';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT, GREENHOUSE_GAS_TYPE } =
  DocumentEventAttributeName;
const { RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;
const { EMISSION_AND_COMPOSTING_METRICS, RECYCLING_BASELINES } =
  DocumentEventName;

const subtype = MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES;
const baseline = MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS;
const exceedingEmissionCoefficient = 0.02;
const massIdDocumentValue = 100;
const baselineValue =
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[subtype][baseline];
const expectedPreventedEmissions = formatNumber(
  massIdDocumentValue * (baselineValue - exceedingEmissionCoefficient),
);

const exceedingEmissionCoefficientExceedingBaseline = baselineValue + 1;

const processorErrors = new PreventedEmissionsProcessorErrors();

const {
  massIdAuditDocument,
  massIdDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocuments({
    partialDocument: {
      externalCreatedAt: addYears(new Date(), 1).toISOString(),
    },
  })
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const preventedEmissionsTestCases = [
  {
    accreditationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [EMISSION_AND_COMPOSTING_METRICS]:
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [
                  [EXCEEDING_EMISSION_COEFFICIENT, undefined],
                  [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                ],
              }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    externalCreatedAt: massIdDocument.externalCreatedAt,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: undefined,
        gasType: 'Methane (CH4)',
        massIdDocumentValue: 1,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the exceeding emission coefficient is undefined (missing)`,
    subtype,
  },
  {
    accreditationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [EMISSION_AND_COMPOSTING_METRICS]:
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [
                  [
                    EXCEEDING_EMISSION_COEFFICIENT,
                    exceedingEmissionCoefficientExceedingBaseline,
                  ],
                  [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                ],
              }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    externalCreatedAt: massIdDocument.externalCreatedAt,
    massIdDocumentValue,
    resultComment: RESULT_COMMENTS.PASSED(
      formatNumber(0),
      baselineValue,
      exceedingEmissionCoefficientExceedingBaseline,
      massIdDocumentValue,
    ),
    resultContent: {
      gasType: 'Methane (CH4)',
      preventedCo2e: formatNumber(0),
      ruleSubject: {
        exceedingEmissionCoefficient:
          exceedingEmissionCoefficientExceedingBaseline,
        gasType: 'Methane (CH4)',
        massIdDocumentValue,
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
    accreditationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [EMISSION_AND_COMPOSTING_METRICS]:
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [
                  [EXCEEDING_EMISSION_COEFFICIENT, null],
                  [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                ],
              }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    externalCreatedAt: massIdDocument.externalCreatedAt,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: null,
        gasType: 'Methane (CH4)',
        massIdDocumentValue: 1,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the exceeding emission coefficient is null (non-positive)`,
    subtype,
  },
  {
    accreditationDocuments: new Map([
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
                ],
              }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    externalCreatedAt: massIdDocument.externalCreatedAt,
    massIdDocumentValue,
    resultComment: RESULT_COMMENTS.PASSED(
      expectedPreventedEmissions,
      baselineValue,
      exceedingEmissionCoefficient,
      massIdDocumentValue,
    ),
    resultContent: {
      gasType: 'Methane (CH4)',
      preventedCo2e: expectedPreventedEmissions,
      ruleSubject: {
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        massIdDocumentValue,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the calculation is correct with all required attributes`,
    subtype,
  },
  {
    accreditationDocuments: new Map([
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
                ],
              }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    externalCreatedAt: massIdDocument.externalCreatedAt,
    massIdDocumentValue,
    resultComment: RESULT_COMMENTS.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE(
      MassIdOrganicSubtype.DOMESTIC_SLUDGE,
    ),
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient,
        gasType: 'Methane (CH4)',
        massIdDocumentValue,
        wasteGeneratorBaseline: undefined,
        wasteSubtype: MassIdOrganicSubtype.DOMESTIC_SLUDGE,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the Waste Generator verification document does not have the "${BASELINES}" info for the waste subtype "${MassIdOrganicSubtype.DOMESTIC_SLUDGE}"`,
    subtype: MassIdOrganicSubtype.DOMESTIC_SLUDGE,
  },
  {
    accreditationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [EMISSION_AND_COMPOSTING_METRICS]:
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [
                  [EXCEEDING_EMISSION_COEFFICIENT, 0],
                  [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                ],
              }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    externalCreatedAt: massIdDocument.externalCreatedAt,
    massIdDocumentValue,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: 0,
        gasType: 'Methane (CH4)',
        massIdDocumentValue,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the exceeding emission coefficient is zero (non-positive)`,
    subtype,
  },
  {
    accreditationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [EMISSION_AND_COMPOSTING_METRICS]:
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [
                  [EXCEEDING_EMISSION_COEFFICIENT, -0.5],
                  [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                ],
              }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [RECYCLING_BASELINES]: stubBoldRecyclingBaselinesEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    externalCreatedAt: massIdDocument.externalCreatedAt,
    massIdDocumentValue,
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: -0.5,
        gasType: 'Methane (CH4)',
        massIdDocumentValue,
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

export const preventedEmissionsErrorTestCases = [
  {
    documents: [
      {
        ...massIdDocument,
        subtype: 'INVALID_SUBTYPE' as MassIdOrganicSubtype,
      },
      ...[...participantsAccreditationDocuments.values()].map((document) => {
        if (document.subtype === RECYCLER) {
          return {
            ...document,
            externalEvents: [
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [
                  [
                    EXCEEDING_EMISSION_COEFFICIENT,
                    exceedingEmissionCoefficient,
                  ],
                  [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                ],
              }),
            ],
          };
        }

        if (document.subtype === WASTE_GENERATOR) {
          return {
            ...document,
            externalEvents: [
              ...(document.externalEvents?.filter(
                (event) => event.name !== RECYCLING_BASELINES.toString(),
              ) ?? []),
              stubBoldRecyclingBaselinesEvent({
                metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
              }),
            ],
          };
        }

        return document;
      }),
    ],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document has an invalid subtype',
  },
  {
    documents: [
      massIdDocument,
      ...[...participantsAccreditationDocuments.values()].map((document) => {
        if (document.subtype === RECYCLER) {
          return {
            ...document,
            externalEvents: [
              ...(document.externalEvents?.filter(
                (event) =>
                  event.name !== EMISSION_AND_COMPOSTING_METRICS.toString(),
              ) ?? []),
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [
                  [
                    EXCEEDING_EMISSION_COEFFICIENT,
                    exceedingEmissionCoefficient,
                  ],
                ],
              }),
            ],
          };
        }

        return document;
      }),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the Recycler Accreditation document does not have the Greenhouse Gas Type (GHG) attribute',
  },
  {
    documents: [...participantsAccreditationDocuments.values()],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document was not found',
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the Recycler accreditation document was not found',
  },
  {
    documents: [
      massIdDocument,
      ...[...participantsAccreditationDocuments.values()]
        .filter((document) => document.subtype !== WASTE_GENERATOR)
        .map((document) => {
          if (document.subtype === RECYCLER) {
            return {
              ...document,
              externalEvents: [
                ...(document.externalEvents?.filter(
                  (event) =>
                    event.name !== EMISSION_AND_COMPOSTING_METRICS.toString(),
                ) ?? []),
                stubBoldEmissionAndCompostingMetricsEvent({
                  metadataAttributes: [
                    [
                      EXCEEDING_EMISSION_COEFFICIENT,
                      exceedingEmissionCoefficient,
                    ],
                    [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                  ],
                }),
              ],
            };
          }

          return document;
        }),
    ],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE
        .MISSING_WASTE_GENERATOR_VERIFICATION_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the Waste Generator Accreditation document was not found',
  },
  {
    documents: [
      massIdDocument,
      ...[...participantsAccreditationDocuments.values()]
        .filter((document) => document.subtype !== WASTE_GENERATOR)
        .map((document) => {
          if (document.subtype === RECYCLER) {
            return {
              ...document,
              externalEvents: [
                stubBoldEmissionAndCompostingMetricsEvent({
                  metadataAttributes: [
                    [
                      EXCEEDING_EMISSION_COEFFICIENT,
                      exceedingEmissionCoefficient,
                    ],
                    [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
                  ],
                }),
              ],
            };
          }

          return document;
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
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the Waste Generator Accreditation document has no valid baselines',
  },
];
