import type { PartialDeep } from 'type-fest';

import {
  type BoldDocument,
  type BoldDocumentRelation,
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { DataSetName, DocumentStatus } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { computeDestinationPoint } from 'geolib';

import { stubAddress } from './address.stubs';
import { stubDocumentEvent } from './document-event.stubs';
import { stubParticipant } from './participant.stubs';

export const stubDocument = (
  partialDocument?: PartialDeep<BoldDocument>,
  stubExternalEvents = true,
): BoldDocument => {
  const externalEvents =
    partialDocument?.externalEvents?.map((event) => stubDocumentEvent(event)) ??
    [];

  return {
    category: stubEnumValue(DocumentCategory),
    createdAt: faker.date.recent().toISOString(),
    currentValue: faker.number.float({ max: 10_000, min: 0 }),
    dataSetName: stubEnumValue(DataSetName),
    externalCreatedAt: faker.date.recent().toISOString(),
    id: faker.string.uuid(),
    isPubliclySearchable: faker.datatype.boolean(),
    measurementUnit: faker.helpers.arrayElement(['kg', 't', 'unit']),
    status: stubEnumValue(DocumentStatus),
    updatedAt: faker.date.recent().toISOString(),
    ...partialDocument,
    externalEvents: [
      ...externalEvents,
      ...(stubExternalEvents
        ? Array.from({ length: faker.number.int({ max: 3, min: 1 }) }, () =>
            stubDocumentEvent(),
          )
        : []),
    ],
    primaryAddress: stubAddress(partialDocument?.primaryAddress),
    primaryParticipant: stubParticipant(partialDocument?.primaryParticipant),
  };
};

export const stubDocumentRelation = (
  partial?: Partial<BoldDocumentRelation>,
): BoldDocumentRelation => ({
  bidirectional: faker.datatype.boolean(),
  category: stubEnumValue(DocumentCategory),
  documentId: faker.string.uuid(),
  subtype: stubEnumValue(DocumentSubtype),
  type: stubEnumValue(DocumentType),
  ...partial,
});

export const stubMassIDDocument = (
  partialDocument?: PartialDeep<BoldDocument>,
): BoldDocument =>
  stubDocument({
    category: DocumentCategory.MASS_ID,
    type: DocumentType.ORGANIC,
    ...partialDocument,
  });

export const generateNearbyCoordinates = (options?: {
  distance?: number;
  latitude?: number;
  longitude?: number;
}) => {
  const baseLat = options?.latitude ?? faker.location.latitude();
  const baseLng = options?.longitude ?? faker.location.longitude();
  const targetDistance = options?.distance;

  if (targetDistance === undefined) {
    const latOffset = faker.number.float({ max: 0.015, min: -0.015 });
    const lngOffset = faker.number.float({ max: 0.015, min: -0.015 });

    return {
      base: { latitude: baseLat, longitude: baseLng },
      nearby: { latitude: baseLat + latOffset, longitude: baseLng + lngOffset },
    };
  }

  const bearing = faker.number.float({ max: 360, min: 0 });

  const destination = computeDestinationPoint(
    { latitude: baseLat, longitude: baseLng },
    targetDistance,
    bearing,
  );

  return {
    base: { latitude: baseLat, longitude: baseLng },
    nearby: {
      latitude: destination.latitude,
      longitude: destination.longitude,
    },
  };
};

export const stubParticipantAccreditationGroupDocument = (
  partialDocument?: PartialDeep<BoldDocument>,
): BoldDocument =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.PARTICIPANT_ACCREDITATION,
  });

export const stubParticipantAccreditationDocument = (
  partialDocument?: PartialDeep<BoldDocument>,
): BoldDocument =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.PARTICIPANT_ACCREDITATION,
  });
