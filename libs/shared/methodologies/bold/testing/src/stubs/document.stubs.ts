import type { PartialDeep } from 'type-fest';

import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  MassSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  type MethodologyDocumentEventAttributeValue,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { computeDestinationPoint } from 'geolib';
import { random } from 'typia';

import { stubAddress } from './address.stubs';
import {
  stubActorEventWithActorType,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from './document-event.stubs';
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

export const stubDocumentWithOneActorType = (
  actorType: DocumentEventActorType,
  partialDocument?: PartialDeep<Document>,
  partialActorEvent?: PartialDeep<DocumentEvent>,
): Document =>
  stubDocument({
    ...partialDocument,
    externalEvents: [stubActorEventWithActorType(actorType, partialActorEvent)],
  });

export const stubDocumentReference = (
  partial?: Partial<DocumentReference>,
): DocumentReference => ({
  ...random<Required<DocumentReference>>(),
  ...partial,
});

export const stubMassAuditDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.MASS_AUDIT,
  });

export const stubMassCertificateAuditDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    subtype: DocumentSubtype.PROCESS,
    type: DocumentType.MASS_CERTIFICATE_AUDIT,
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

// TODO: will be renamed to stubCreditDocument when all structure is ready
export const stubNewCreditDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    category: DocumentCategory.METHODOLOGY,
    subtype: random<DocumentSubtype.TCC | DocumentSubtype.TRC>(),
    type: DocumentType.CREDIT,
    ...partialDocument,
  });

export const stubMassCertificateDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.MASS_CERTIFICATE,
  });

export const stubMassDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    category: DocumentCategory.MASS,
    subtype: stubEnumValue(MassSubtype),
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

export const stubMassAuditDocumentWithActorAndAttribute = (
  eventName: DocumentEventName,
  attributeName: DocumentEventAttributeName,
  attributeValue: MethodologyDocumentEventAttributeValue,
  attributePairs: Array<
    [DocumentEventAttributeName, MethodologyDocumentEventAttributeValue]
  >,
  partialDocument?: PartialDeep<Document>,
) =>
  stubDocument({
    ...stubMassAuditDocument(partialDocument),
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: eventName }, [
        [attributeName, attributeValue],
        ...attributePairs,
      ]),
    ],
  });

export const stubCreditDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.CREDIT,
    ...partialDocument,
  });

export const stubCreditCertificatesDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.CREDIT_CERTIFICATES,
  });

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

export const stubMassCertificateAuditWithMethodologySlug = (
  methodologySlug?: string,
  partialDocument?: PartialDeep<Document>,
) =>
  stubMassCertificateAuditDocument({
    externalEvents: [
      stubDocumentEventWithMetadataAttributes(
        { name: DocumentEventName.ACTOR },
        [
          [
            DocumentEventAttributeName.ACTOR_TYPE,
            DocumentEventActorType.AUDITOR,
          ],
          [
            DocumentEventAttributeName.METHODOLOGY_SLUG,
            methodologySlug ?? random<NonEmptyString>(),
          ],
        ],
      ),
    ],
    ...partialDocument,
  });
