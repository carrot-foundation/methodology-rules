import type { PartialDeep } from 'type-fest';

import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  type DocumentReference,
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
      ...(stubExternalEvents ? random<Array<DocumentEvent>>() : []),
      ...externalEvents,
    ],
    primaryAddress: stubAddress(partialDocument?.primaryAddress),
    primaryParticipant: stubParticipant(partialDocument?.primaryParticipant),
  };
};

export const stubDocumentReference = (
  partial?: Partial<DocumentReference>,
): DocumentReference => ({
  ...random<Required<DocumentReference>>(),
  ...partial,
});

export const stubMassAuditCertificateDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    category: DocumentCategory.METHODOLOGY,
    subtype: DocumentSubtype.PROCESS,
    type: random<DocumentType.GAS_ID | DocumentType.RECYCLED_ID>(),
    ...partialDocument,
  });

export const stubCreditDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    category: DocumentCategory.METHODOLOGY,
    subtype: random<DocumentSubtype.TCC | DocumentSubtype.TRC>(),
    type: DocumentType.CREDIT_ORDER,
    ...partialDocument,
  });

export const stubMassIdDocument = (
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

export const stubMethodologyDefinitionDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.DEFINITION,
  });

export const stubParticipantHomologationGroupDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.PARTICIPANT_HOMOLOGATION,
  });

export const stubParticipantHomologationDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.PARTICIPANT_HOMOLOGATION,
  });
