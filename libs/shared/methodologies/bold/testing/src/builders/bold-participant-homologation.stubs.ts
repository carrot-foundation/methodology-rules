import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentEventHomologationStatus,
  type DocumentEventScaleType,
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { addDays, getYear, subDays } from 'date-fns';
import { random } from 'typia';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  mergeEventsMaps,
  mergeMetadataAttributes,
  type MetadataAttributeParameter,
} from './bold.builder.helpers';
import {
  type StubBoldDocumentEventParameters,
  type StubBoldDocumentParameters,
} from './bold.stubs.types';

const {
  EMISSION_AND_COMPOSTING_METRICS,
  HOMOLOGATION_RESULT,
  MONITORING_SYSTEMS_AND_EQUIPMENT,
  RECYCLING_BASELINE,
} = DocumentEventName;
const {
  BASELINES,
  EFFECTIVE_DATE,
  EXCEEDING_EMISSION_COEFFICIENT,
  EXPIRATION_DATE,
  HOMOLOGATION_STATUS,
  SCALE_TYPE,
  SORTING_FACTOR,
} = DocumentEventAttributeName;
const { DATE } = MethodologyDocumentEventAttributeFormat;

const defaultHomologationResultEventMetadataAttributes: MetadataAttributeParameter[] =
  [
    {
      format: DATE,
      name: EFFECTIVE_DATE,
      value: subDays(new Date(), 2).toISOString(),
    },
    {
      format: DATE,
      name: EXPIRATION_DATE,
      value: addDays(new Date(), 2).toISOString(),
    },
    [HOMOLOGATION_STATUS, DocumentEventHomologationStatus.APPROVED],
  ];

export const stubBoldHomologationResultEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  stubDocumentEventWithMetadataAttributes(
    { ...partialDocumentEvent, name: HOMOLOGATION_RESULT },
    mergeMetadataAttributes(
      defaultHomologationResultEventMetadataAttributes,
      metadataAttributes,
    ),
  );

const defaultEmissionAndCompostingMetricsEventMetadataAttributes: MetadataAttributeParameter[] =
  [
    {
      name: EXCEEDING_EMISSION_COEFFICIENT,
      value: faker.number.float({ max: 1, min: 0 }),
      valueSuffix: 'tCO2e/ton',
    },
    [SORTING_FACTOR, faker.number.float({ max: 1, min: 0 })],
  ];

export const stubBoldEmissionAndCompostingMetricsEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
    },
    mergeMetadataAttributes(
      defaultEmissionAndCompostingMetricsEventMetadataAttributes,
      metadataAttributes,
    ),
  );

const defaultRecyclingBaselineEventMetadataAttributes: MetadataAttributeParameter[] =
  [
    [
      BASELINES,
      { [random<MassIdOrganicSubtype>()]: random<MethodologyBaseline>() },
    ],
  ];

export const stubBoldRecyclingBaselineEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: RECYCLING_BASELINE,
    },
    mergeMetadataAttributes(
      defaultRecyclingBaselineEventMetadataAttributes,
      metadataAttributes,
    ),
  );

const defaultMonitoringSystemsAndEquipmentEventMetadataAttributes: MetadataAttributeParameter[] =
  [[SCALE_TYPE, random<DocumentEventScaleType>()]];

export const stubBoldMonitoringSystemsAndEquipmentEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: MONITORING_SYSTEMS_AND_EQUIPMENT,
    },
    mergeMetadataAttributes(
      defaultMonitoringSystemsAndEquipmentEventMetadataAttributes,
      metadataAttributes,
    ),
  );

const boldHomologationExternalEventsMap = new Map([
  [
    EMISSION_AND_COMPOSTING_METRICS,
    stubBoldEmissionAndCompostingMetricsEvent(),
  ],
  [HOMOLOGATION_RESULT, stubBoldHomologationResultEvent()],
]);

export const stubBoldHomologationDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldHomologationExternalEventsMap
    : mergeEventsMaps(boldHomologationExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: DocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      },
      false,
    ),
  };
};
