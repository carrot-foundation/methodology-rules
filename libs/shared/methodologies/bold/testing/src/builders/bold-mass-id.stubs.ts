import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentEvent,
  DocumentEventContainerType,
  type DocumentEventName,
  DocumentEventScaleType,
  DocumentEventVehicleType,
  DocumentEventWeighingCaptureMethod,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  type LicensePlate,
  MethodologyDocumentEventAttributeFormat,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { format } from 'date-fns';

import {
  stubDocument,
  stubDocumentEventAttachment,
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

const { DATE, KILOGRAM } = MethodologyDocumentEventAttributeFormat;

const defaultPickUpAttributes: MetadataAttributeParameter[] = [
  ['Waste Origin', faker.datatype.boolean()],
  ['Captured GPS Latitude', faker.location.latitude()],
  ['Captured GPS Longitude', faker.location.longitude()],
  ['Description', faker.lorem.sentence()],
  ['Driver Identifier', faker.string.uuid()],
  ['Driver Identifier Exemption Justification', faker.lorem.sentence()],
  ['Local Waste Classification Description', faker.lorem.sentence()],
  ['Local Waste Classification ID', faker.string.uuid()],
  ['Vehicle Description', faker.vehicle.vehicle()],
  {
    name: 'Vehicle License Plate',
    sensitive: true,
    value: 'FKE1A23' as LicensePlate,
  },
  ['Vehicle Type', stubEnumValue(DocumentEventVehicleType)],
];

export const stubBoldMassIDPickUpEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: 'Pick-up',
        value: partialDocumentEvent?.value ?? faker.number.float({ min: 1 }),
      },
      mergeMetadataAttributes(defaultPickUpAttributes, metadataAttributes),
    ),
    metadataAttributes,
  );

const defaultTransportManifestWithExemptionAttributes: MetadataAttributeParameter[] =
  [['Exemption Justification', faker.lorem.sentence()]];

const defaultTransportManifestAttributes: MetadataAttributeParameter[] = [
  ['Document Number', faker.string.uuid()],
  ['Document Type', 'MTR'],
  {
    format: DATE,
    name: 'Issue Date',
    value: format(faker.date.recent(), 'yyyy-MM-dd'),
  },
];

export const stubBoldMassIDTransportManifestEvent = ({
  metadataAttributes,
  partialDocumentEvent,
  withExemptionJustification,
}: StubBoldDocumentEventParameters & {
  withExemptionJustification?: boolean | undefined;
} = {}): DocumentEvent => {
  const defaultAttributes =
    withExemptionJustification === true
      ? defaultTransportManifestWithExemptionAttributes
      : defaultTransportManifestAttributes;

  return attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        attachments:
          withExemptionJustification === true
            ? []
            : [
                stubDocumentEventAttachment({
                  label: 'Transport Manifest',
                }),
              ],
        ...partialDocumentEvent,
        name: 'Transport Manifest',
        value: partialDocumentEvent?.value ?? faker.number.float({ min: 1 }),
      },
      mergeMetadataAttributes(defaultAttributes, metadataAttributes),
    ),
    metadataAttributes,
  );
};

const defaultWeighingAttributes: MetadataAttributeParameter[] = [
  ['Description', faker.lorem.sentence()],
  [
    'Weighing Capture Method',
    stubEnumValue(DocumentEventWeighingCaptureMethod),
  ],
  ['Scale Type', stubEnumValue(DocumentEventScaleType)],
  ['Scale Validation', { documentId: faker.string.uuid() }],
  [
    'Container Type',
    faker.helpers.arrayElement(
      Object.values(DocumentEventContainerType).filter(
        (type) => type !== DocumentEventContainerType.Truck,
      ),
    ),
  ],
  ['Container Quantity', faker.number.int({ min: 1 })],
  {
    format: KILOGRAM,
    name: 'Container Capacity',
    value: faker.number.float({ min: 1 }),
  },
  {
    format: KILOGRAM,
    name: 'Gross Weight',
    value: faker.number.float({ min: 1 }),
  },
  {
    format: KILOGRAM,
    name: 'Tare',
    value: faker.number.float({ min: 1 }),
  },
  {
    name: 'Vehicle License Plate',
    sensitive: true,
    value: 'FKE1A23' as LicensePlate,
  },
];

export const stubBoldMassIDWeighingEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: 'Weighing',
        value: partialDocumentEvent?.value ?? faker.number.float({ min: 1 }),
      },
      mergeMetadataAttributes(defaultWeighingAttributes, metadataAttributes),
    ),
    metadataAttributes,
  );

const defaultDropOffAttributes: MetadataAttributeParameter[] = [
  ['Receiving Operator Identifier', faker.string.uuid()],
  ['Recycler Operator Identifier', faker.string.uuid()],
  ['Description', faker.lorem.sentence()],
  ['Captured GPS Latitude', faker.location.latitude()],
  ['Captured GPS Longitude', faker.location.longitude()],
];

export const stubBoldMassIDDropOffEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: 'Drop-off',
        value: partialDocumentEvent?.value ?? faker.number.float({ min: 1 }),
      },
      mergeMetadataAttributes(defaultDropOffAttributes, metadataAttributes),
    ),
    metadataAttributes,
  );

const defaultRecyclingManifestWithExemptionAttributes: MetadataAttributeParameter[] =
  [['Exemption Justification', faker.lorem.sentence()]];

const defaultRecyclingManifestAttributes: MetadataAttributeParameter[] = [
  ['Document Number', faker.string.uuid()],
  ['Document Type', 'CDF'],
  {
    format: DATE,
    name: 'Issue Date',
    value: format(faker.date.recent(), 'yyyy-MM-dd'),
  },
];

export const stubBoldMassIDRecyclingManifestEvent = ({
  metadataAttributes,
  partialDocumentEvent,
  withExemptionJustification,
}: StubBoldDocumentEventParameters & {
  withExemptionJustification?: boolean | undefined;
} = {}): DocumentEvent => {
  const defaultAttributes =
    withExemptionJustification === true
      ? defaultRecyclingManifestWithExemptionAttributes
      : defaultRecyclingManifestAttributes;

  return attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        attachments:
          withExemptionJustification === true
            ? []
            : [
                stubDocumentEventAttachment({
                  label: 'Recycling Manifest',
                }),
              ],
        ...partialDocumentEvent,
        name: 'Recycling Manifest',
        value: partialDocumentEvent?.value ?? faker.number.float({ min: 1 }),
      },
      mergeMetadataAttributes(defaultAttributes, metadataAttributes),
    ),
    metadataAttributes,
  );
};

export const stubBoldMassIDRecycledEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: 'Recycled',
        value: partialDocumentEvent?.value ?? faker.number.float({ min: 1 }),
      },
      mergeMetadataAttributes([], metadataAttributes),
    ),
    metadataAttributes,
  );

const defaultSortingAttributes: MetadataAttributeParameter[] = [
  ['Description', faker.lorem.sentence()],
  ['Sorting Factor', faker.number.float({ max: 1, min: 0 })],
];

export const stubBoldMassIDSortingEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: 'Sorting',
        value: partialDocumentEvent?.value ?? faker.number.float({ min: 1 }),
      },
      mergeMetadataAttributes(defaultSortingAttributes, metadataAttributes),
    ),
    metadataAttributes,
  );

export type BoldMassIDExternalEventsMap = Map<string, DocumentEvent>;
export type BoldMassIDExternalEventsObject = Partial<
  Record<DocumentEventName, DocumentEvent>
>;

export const boldMassIDExternalEventsMap: BoldMassIDExternalEventsMap = new Map(
  [
    ['Pick-up', stubBoldMassIDPickUpEvent()],
    [
      'Transport Manifest',
      stubBoldMassIDTransportManifestEvent({
        withExemptionJustification: false,
      }),
    ],
    ['Weighing', stubBoldMassIDWeighingEvent()],
    // eslint-disable-next-line perfectionist/sort-maps
    ['Drop-off', stubBoldMassIDDropOffEvent()],
    ['Sorting', stubBoldMassIDSortingEvent()],
    // eslint-disable-next-line perfectionist/sort-maps
    [
      'Recycling Manifest',
      stubBoldMassIDRecyclingManifestEvent({
        withExemptionJustification: false,
      }),
    ],
    // eslint-disable-next-line perfectionist/sort-maps
    ['Recycled', stubBoldMassIDRecycledEvent()],
  ],
);

export const stubBoldMassIDDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldMassIDExternalEventsMap
    : mergeEventsMaps(boldMassIDExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        subtype: stubEnumValue(MassIDOrganicSubtype),
        ...partialDocument,
        category: 'MassID',
        currentValue: isNil(partialDocument?.currentValue)
          ? faker.number.float({ min: 1 })
          : partialDocument.currentValue,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        measurementUnit: 'kg',
        type: 'Organic',
      },
      false,
    ),
  };
};
