import { isNil } from '@carrot-fndn/shared/helpers';
import {
  BoldAccreditationStatus,
  BoldBaseline,
  type BoldDocument,
  BoldScaleType,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
  BoldDocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { DocumentEventAttributeFormat } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { addDays, getYear, subDays } from 'date-fns';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  attachExplicitAttributes,
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
} = BoldDocumentEventName;
const {
  ACCREDITATION_STATUS,
  BASELINES,
  EFFECTIVE_DATE,
  EXCEEDING_EMISSION_COEFFICIENT,
  EXPIRATION_DATE,
  REFERENCE_YEAR,
  SCALE_TYPE,
  SORTING_FACTOR,
} = BoldAttributeName;
const { DATE } = DocumentEventAttributeFormat;

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
    [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
  ];

export const stubBoldAccreditationResultEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      { ...partialDocumentEvent, name: ACCREDITATION_RESULT },
      mergeMetadataAttributes(
        defaultAccreditationResultEventMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
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
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
      },
      mergeMetadataAttributes(
        defaultEmissionAndCompostingMetricsEventMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
  );

const defaultRecyclingBaselinesEventMetadataAttributes: MetadataAttributeParameter[] =
  [
    [
      BASELINES,
      {
        [stubEnumValue(MassIDOrganicSubtype)]: stubEnumValue(BoldBaseline),
      },
    ],
  ];

export const stubBoldRecyclingBaselinesEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: RECYCLING_BASELINES,
      },
      mergeMetadataAttributes(
        defaultRecyclingBaselinesEventMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
  );

const defaultMonitoringSystemsAndEquipmentEventMetadataAttributes: MetadataAttributeParameter[] =
  [[SCALE_TYPE, stubEnumValue(BoldScaleType)]];

export const stubBoldMonitoringSystemsAndEquipmentEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: MONITORING_SYSTEMS_AND_EQUIPMENT,
      },
      mergeMetadataAttributes(
        defaultMonitoringSystemsAndEquipmentEventMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
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
}: StubBoldDocumentParameters = {}): BoldDocument => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldAccreditationExternalEventsMap
    : mergeEventsMaps(boldAccreditationExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: BoldDocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: BoldDocumentType.PARTICIPANT_ACCREDITATION,
      },
      false,
    ),
  };
};
