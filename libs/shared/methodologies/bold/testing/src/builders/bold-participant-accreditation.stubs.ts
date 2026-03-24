import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentEventScaleType,
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';
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

const { DATE } = MethodologyDocumentEventAttributeFormat;

const defaultAccreditationResultEventMetadataAttributes: MetadataAttributeParameter[] =
  [
    {
      format: DATE,
      name: 'Effective Date',
      value: subDays(new Date(), 2).toISOString(),
    },
    {
      format: DATE,
      name: 'Expiration Date',
      value: addDays(new Date(), 2).toISOString(),
    },
    ['Accreditation Status', 'Approved'],
  ];

export const stubBoldAccreditationResultEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      { ...partialDocumentEvent, name: 'Accreditation Result' },
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
      name: 'Exceeding Emission Coefficient (per ton)',
      value: faker.number.float({ max: 1, min: 0 }),
      valueSuffix: 'tCO2e/ton',
    },
    ['Sorting Factor', faker.number.float({ max: 1, min: 0 })],
    {
      name: 'Reference Year',
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
        name: `${'Emissions & Composting Metrics'} (${getYear(new Date())})`,
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
      'Baselines',
      {
        [stubEnumValue(MassIDOrganicSubtype)]:
          stubEnumValue(MethodologyBaseline),
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
        name: 'Recycling Baselines',
      },
      mergeMetadataAttributes(
        defaultRecyclingBaselinesEventMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
  );

const defaultMonitoringSystemsAndEquipmentEventMetadataAttributes: MetadataAttributeParameter[] =
  [['Scale Type', stubEnumValue(DocumentEventScaleType)]];

export const stubBoldMonitoringSystemsAndEquipmentEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: 'Monitoring Systems & Equipment',
      },
      mergeMetadataAttributes(
        defaultMonitoringSystemsAndEquipmentEventMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
  );

const boldAccreditationExternalEventsMap = new Map([
  ['Accreditation Result', stubBoldAccreditationResultEvent()],
  [
    'Emissions & Composting Metrics',
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
        category: 'Methodology',
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: 'Participant Accreditation',
      },
      false,
    ),
  };
};
