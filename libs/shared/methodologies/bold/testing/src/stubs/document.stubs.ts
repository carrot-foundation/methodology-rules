import type { PartialDeep } from 'type-fest';

import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  type DocumentRelation,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { computeDestinationPoint } from 'geolib';
import { random } from 'typia';

import { stubAddress } from './address.stubs';
import { stubDocumentEvent } from './document-event.stubs';
import { stubParticipant } from './participant.stubs';

export const stubDocument = (
  partialDocument?: PartialDeep<Document>,
  stubExternalEvents = true,
): Document => {
  const externalEvents =
    partialDocument?.externalEvents?.map((event) => stubDocumentEvent(event)) ??
    [];

  return {
    ...random<Document>(),
    category: stubEnumValue(DocumentCategory),
    ...partialDocument,
    externalEvents: [
      ...(stubExternalEvents ? random<DocumentEvent[]>() : []),
      ...externalEvents,
    ],
    primaryAddress: stubAddress(partialDocument?.primaryAddress),
    primaryParticipant: stubParticipant(partialDocument?.primaryParticipant),
  };
};

export const stubDocumentRelation = (
  partial?: Partial<DocumentRelation>,
): DocumentRelation => ({
  ...random<Required<DocumentRelation>>(),
  ...partial,
});

export const stubMassIDDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
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
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.PARTICIPANT_ACCREDITATION,
  });

export const stubParticipantAccreditationDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.PARTICIPANT_ACCREDITATION,
  });
