import {
  BoldStubsBuilder,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldRecyclingBaselineEvent,
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

import { AVOIDED_EMISSIONS_BASELINE_MATRIX } from './avoided-emissions.constants';
import { AvoidedEmissionsProcessorErrors } from './avoided-emissions.errors';
import { RESULT_COMMENTS } from './avoided-emissions.processor';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT } =
  DocumentEventAttributeName;
const { RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;
const { EMISSION_AND_COMPOSTING_METRICS, RECYCLING_BASELINE } =
  DocumentEventName;

const subtype = MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES;
const baseline = MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS;
const exceedingEmissionCoefficient = 0.8;
const massIdDocumentValue = 100;
const baselineValue = AVOIDED_EMISSIONS_BASELINE_MATRIX[subtype][baseline];
const expectedAvoidedEmissions =
  (1 - exceedingEmissionCoefficient) * baselineValue * massIdDocumentValue;

export const avoidedEmissionsTestCases = [
  {
    homologationDocuments: new Map([
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
            [RECYCLING_BASELINE]: stubBoldRecyclingBaselineEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the Recycler Homologation document does not have the "${EXCEEDING_EMISSION_COEFFICIENT}" attribute`,
    subtype,
  },
  {
    homologationDocuments: new Map([
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
            [RECYCLING_BASELINE]: stubBoldRecyclingBaselineEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    massIdDocumentValue,
    resultComment: RESULT_COMMENTS.APPROVED(
      expectedAvoidedEmissions,
      exceedingEmissionCoefficient,
      massIdDocumentValue,
    ),
    resultContent: {
      avoidedEmissions: expectedAvoidedEmissions,
    },
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the calculation is correct with all required attributes`,
    subtype,
  },
  {
    homologationDocuments: new Map([
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
            [RECYCLING_BASELINE]: stubBoldRecyclingBaselineEvent({
              metadataAttributes: [[BASELINES, { [subtype]: baseline }]],
            }),
          },
        },
      ],
    ]),
    massIdDocumentValue,
    resultComment: RESULT_COMMENTS.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE(
      MassIdOrganicSubtype.DOMESTIC_SLUDGE,
    ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the Waste Generator Homologation document does not have the "${BASELINES}" info for the waste subtype "${subtype}"`,
    subtype: MassIdOrganicSubtype.DOMESTIC_SLUDGE,
  },
];

const processorErrors = new AvoidedEmissionsProcessorErrors();

const {
  massIdAuditDocument,
  massIdDocument,
  participantsHomologationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantHomologationDocuments()
  .build();

const wasteGeneratorHomologationDocument =
  participantsHomologationDocuments.get(WASTE_GENERATOR) as Document;

export const avoidedEmissionsErrorTestCases = [
  {
    documents: [
      {
        ...massIdDocument,
        subtype: 'invalid' as MassIdOrganicSubtype,
      },
      ...participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the MassID document has an invalid subtype',
  },
  {
    documents: [...participantsHomologationDocuments.values()],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the MassID document was not found',
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the Recycler Homologation document was not found',
  },
  {
    documents: [
      massIdDocument,
      ...participantsHomologationDocuments.values(),
    ].filter((document) => document.subtype !== WASTE_GENERATOR),
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE
        .MISSING_WASTE_GENERATOR_HOMOLOGATION_DOCUMENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the Waste Generator Homologation document was not found',
  },
  {
    documents: [
      massIdDocument,
      ...[...participantsHomologationDocuments.values()].filter(
        (document) => document.subtype !== WASTE_GENERATOR,
      ),
      {
        ...wasteGeneratorHomologationDocument,
        externalEvents: [
          ...(wasteGeneratorHomologationDocument.externalEvents?.filter(
            (event) => event.name !== RECYCLING_BASELINE.toString(),
          ) ?? []),
          stubBoldRecyclingBaselineEvent({
            metadataAttributes: [[BASELINES, undefined]],
          }),
        ],
      },
    ],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'the Waste Generator Homologation document has no valid baselines',
  },
];
