import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventContainerType,
  DocumentEventName,
  DocumentEventScaleType,
  DocumentEventVehicleType,
  DocumentEventWeighingCaptureMethod,
  DocumentType,
  MassSubtype,
  NewDocumentEventAttributeName,
  NewMeasurementUnit,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  type LicensePlate,
  MethodologyDocumentEventAttributeFormat,
  type MethodologyDocumentEventAttributeReference,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { format } from 'date-fns';
import { random } from 'typia';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  type MetadataAttributeParameter,
  mergeEventsMaps,
  mergeMetadataAttributes,
} from './bold.builder.helpers';
import {
  type StubBoldDocumentEventParameters,
  type StubBoldDocumentParameters,
} from './bold.stubs.types';

const { MASS_ID } = DocumentCategory;
const {
  DROP_OFF,
  PICK_UP,
  RECYCLED,
  RECYCLING_MANIFEST,
  TRANSPORT_MANIFEST,
  WEIGHING,
} = DocumentEventName;
const {
  CAPTURED_GPS_LATITUDE,
  CAPTURED_GPS_LONGITUDE,
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DESCRIPTION,
  DOCUMENT_NUMBER,
  DOCUMENT_TYPE,
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  EXEMPTION_JUSTIFICATION,
  GROSS_WEIGHT,
  ISSUE_DATE,
  LOCAL_WASTE_CLASSIFICATION_DESC,
  LOCAL_WASTE_CLASSIFICATION_ID,
  MASS_NET_WEIGHT,
  RECYCLER_OPERATOR_IDENTIFIER,
  SCALE_HOMOLOGATION,
  SCALE_TYPE,
  TARE,
  VEHICLE_DESCRIPTION,
  VEHICLE_LICENSE_PLATE,
  VEHICLE_TYPE,
  WASTE_ORIGIN,
  WEIGHING_CAPTURE_METHOD,
} = NewDocumentEventAttributeName;
const { DATE, KILOGRAM } = MethodologyDocumentEventAttributeFormat;

const defaultPickUpAttributes: MetadataAttributeParameter[] = [
  [WASTE_ORIGIN, random<boolean>()],
  [CAPTURED_GPS_LATITUDE, faker.location.latitude()],
  [CAPTURED_GPS_LONGITUDE, faker.location.longitude()],
  [DESCRIPTION, faker.lorem.sentence()],
  [DRIVER_IDENTIFIER, faker.string.uuid()],
  [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, faker.lorem.sentence()],
  [LOCAL_WASTE_CLASSIFICATION_DESC, faker.lorem.sentence()],
  [LOCAL_WASTE_CLASSIFICATION_ID, faker.string.uuid()],
  [VEHICLE_DESCRIPTION, faker.vehicle.vehicle()],
  {
    name: VEHICLE_LICENSE_PLATE,
    sensitive: true,
    value: random<LicensePlate>(),
  },
  [VEHICLE_TYPE, random<DocumentEventVehicleType>()],
];

export const stubBoldMassIdPickUpEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: PICK_UP,
    },
    mergeMetadataAttributes(defaultPickUpAttributes, metadataAttributes),
  );

const defaultTransportManifestWithExemptionAttributes: MetadataAttributeParameter[] =
  [[EXEMPTION_JUSTIFICATION, faker.lorem.sentence()]];

const defaultTransportManifestAttributes: MetadataAttributeParameter[] = [
  [DOCUMENT_NUMBER, faker.string.uuid()],
  [DOCUMENT_TYPE, ReportType.MTR],
  {
    format: DATE,
    name: ISSUE_DATE,
    value: format(faker.date.recent(), 'yyyy-MM-dd'),
  },
];

export const stubBoldMassIdTransportManifestEvent = ({
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

  return stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: TRANSPORT_MANIFEST,
    },
    mergeMetadataAttributes(defaultAttributes, metadataAttributes),
  );
};

const defaultWeighingAttributes: MetadataAttributeParameter[] = [
  [DESCRIPTION, faker.lorem.sentence()],
  [WEIGHING_CAPTURE_METHOD, random<DocumentEventWeighingCaptureMethod>()],
  [SCALE_TYPE, random<DocumentEventScaleType>()],
  [SCALE_HOMOLOGATION, random<MethodologyDocumentEventAttributeReference>()],
  [CONTAINER_TYPE, random<DocumentEventContainerType>()],
  [CONTAINER_QUANTITY, faker.number.int({ min: 1 })],
  [CONTAINER_CAPACITY, faker.number.int({ min: 1 })],
  {
    format: KILOGRAM,
    name: GROSS_WEIGHT,
    value: faker.number.float({ min: 1 }),
  },
  {
    format: KILOGRAM,
    name: MASS_NET_WEIGHT,
    value: faker.number.float({ min: 1 }),
  },
  {
    format: KILOGRAM,
    name: TARE,
    value: faker.number.float({ min: 1 }),
  },
  {
    name: VEHICLE_LICENSE_PLATE,
    sensitive: true,
    value: random<LicensePlate>(),
  },
];

export const stubBoldMassIdWeighingSingleStepEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: WEIGHING,
    },
    mergeMetadataAttributes(defaultWeighingAttributes, metadataAttributes),
  );

const defaultDropOffAttributes: MetadataAttributeParameter[] = [
  [RECYCLER_OPERATOR_IDENTIFIER, faker.string.uuid()],
  [DESCRIPTION, faker.lorem.sentence()],
  [CAPTURED_GPS_LATITUDE, faker.location.latitude()],
  [CAPTURED_GPS_LONGITUDE, faker.location.longitude()],
];

export const stubBoldMassIdDropOffEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: DROP_OFF,
    },
    mergeMetadataAttributes(defaultDropOffAttributes, metadataAttributes),
  );

const defaultRecyclingManifestWithExemptionAttributes: MetadataAttributeParameter[] =
  [[EXEMPTION_JUSTIFICATION, faker.lorem.sentence()]];

const defaultRecyclingManifestAttributes: MetadataAttributeParameter[] = [
  [DOCUMENT_NUMBER, faker.string.uuid()],
  [DOCUMENT_TYPE, ReportType.MTR],
  {
    format: DATE,
    name: ISSUE_DATE,
    value: format(faker.date.recent(), 'yyyy-MM-dd'),
  },
];

export const stubBoldMassIdRecyclingManifestEvent = ({
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

  return stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: RECYCLING_MANIFEST,
    },
    mergeMetadataAttributes(defaultAttributes, metadataAttributes),
  );
};

export const stubBoldMassIdRecycledEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: RECYCLED,
    },
    mergeMetadataAttributes([], metadataAttributes),
  );

export type BoldMassIdExternalEventsMap = Map<
  DocumentEventName | string,
  DocumentEvent
>;
export type BoldMassIdExternalEventsObject = Partial<
  Record<DocumentEventName, DocumentEvent>
>;

const boldMassIdExternalEventsMap: BoldMassIdExternalEventsMap = new Map([
  [DROP_OFF, stubBoldMassIdDropOffEvent()],
  [PICK_UP, stubBoldMassIdPickUpEvent()],
  [RECYCLED, stubBoldMassIdRecycledEvent()],
  [
    RECYCLING_MANIFEST,
    stubBoldMassIdRecyclingManifestEvent({
      withExemptionJustification: false,
    }),
  ],
  [
    TRANSPORT_MANIFEST,
    stubBoldMassIdTransportManifestEvent({
      withExemptionJustification: false,
    }),
  ],
  [WEIGHING, stubBoldMassIdWeighingSingleStepEvent()],
]);

export const stubBoldMassIdDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = mergeEventsMaps(
    boldMassIdExternalEventsMap,
    externalEventsMap,
  );

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: MASS_ID,
        currentValue: faker.number.float({ min: 1 }),
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        measurementUnit: NewMeasurementUnit.KG,
        subtype: stubEnumValue(MassSubtype),
        type: DocumentType.ORGANIC,
      },
      false,
    ),
  };
};
