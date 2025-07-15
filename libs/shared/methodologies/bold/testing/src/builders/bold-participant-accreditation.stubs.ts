import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentEventAccreditationStatus,
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
  ACCREDITATION_RESULT,
  EMISSION_AND_COMPOSTING_METRICS,
  MONITORING_SYSTEMS_AND_EQUIPMENT,
  RECYCLING_BASELINES,
} = DocumentEventName;
const {
  ACCREDITATION_STATUS,
  BASELINES,
  EFFECTIVE_DATE,
  EXCEEDING_EMISSION_COEFFICIENT,
  EXPIRATION_DATE,
  REFERENCE_YEAR,
  SCALE_TYPE,
  SORTING_FACTOR,
} = DocumentEventAttributeName;
const { DATE } = MethodologyDocumentEventAttributeFormat;

const defaultAccreditationResultEventMetadataAttributes: MetadataAttributeParameter[] =
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
    [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
  ];

export const stubBoldAccreditationResultEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  stubDocumentEventWithMetadataAttributes(
    { ...partialDocumentEvent, name: ACCREDITATION_RESULT },
    mergeMetadataAttributes(
      defaultAccreditationResultEventMetadataAttributes,
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
    {
      name: REFERENCE_YEAR,
      value: getYear(new Date()),
    },
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

const defaultRecyclingBaselinesEventMetadataAttributes: MetadataAttributeParameter[] =
  [
    [
      BASELINES,
      { [random<MassIdOrganicSubtype>()]: random<MethodologyBaseline>() },
    ],
  ];

export const stubBoldRecyclingBaselinesEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: RECYCLING_BASELINES,
    },
    mergeMetadataAttributes(
      defaultRecyclingBaselinesEventMetadataAttributes,
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

const boldAccreditationExternalEventsMap = new Map([
  [ACCREDITATION_RESULT, stubBoldAccreditationResultEvent()],
  [
    EMISSION_AND_COMPOSTING_METRICS,
    stubBoldEmissionAndCompostingMetricsEvent(),
  ],
]);

export const stubBoldAccreditationDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldAccreditationExternalEventsMap
    : mergeEventsMaps(boldAccreditationExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: DocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: DocumentType.PARTICIPANT_ACCREDITATION,
      },
      false,
    ),
  };
};
