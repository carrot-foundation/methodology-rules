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
import { RESULT_COMMENTS } from './prevented-emissions.processor';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT } =
  DocumentEventAttributeName;
const { RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;
const { EMISSION_AND_COMPOSTING_METRICS, RECYCLING_BASELINES } =
  DocumentEventName;

const subtype = MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES;
const baseline = MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS;
const exceedingEmissionCoefficient = 0.8;
const massIdDocumentValue = 100;
const baselineValue =
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[subtype][baseline];
const expectedPreventedEmissions =
  (1 - exceedingEmissionCoefficient) * baselineValue * massIdDocumentValue;

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
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultContent: {
      ruleSubject: {
        exceedingEmissionCoefficient: undefined,
        massIdDocumentValue: 1,
        wasteGeneratorBaseline: baseline,
        wasteSubtype: subtype,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the Recycler Accreditation document does not have the "${EXCEEDING_EMISSION_COEFFICIENT}" attribute`,
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
      preventedCo2e: expectedPreventedEmissions,
      ruleSubject: {
        exceedingEmissionCoefficient,
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
        massIdDocumentValue,
        wasteGeneratorBaseline: undefined,
        wasteSubtype: MassIdOrganicSubtype.DOMESTIC_SLUDGE,
      },
    },
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the Waste Generator verification document does not have the "${BASELINES}" info for the waste subtype "${subtype}"`,
    subtype: MassIdOrganicSubtype.DOMESTIC_SLUDGE,
  },
];

const wasteGeneratorVerificationDocument =
  participantsAccreditationDocuments.get(WASTE_GENERATOR) as Document;

export const preventedEmissionsErrorTestCases = [
  {
    documents: [
      {
        ...massIdDocument,
        subtype: 'invalid' as MassIdOrganicSubtype,
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document has an invalid subtype',
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
      ...participantsAccreditationDocuments.values(),
    ].filter((document) => document.subtype !== WASTE_GENERATOR),
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
      ...[...participantsAccreditationDocuments.values()].filter(
        (document) => document.subtype !== WASTE_GENERATOR,
      ),
      {
        ...wasteGeneratorVerificationDocument,
        externalEvents: [
          ...(wasteGeneratorVerificationDocument.externalEvents?.filter(
            (event) => event.name !== RECYCLING_BASELINES.toString(),
          ) ?? []),
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
