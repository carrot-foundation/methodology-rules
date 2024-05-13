import type { PartialDeep } from 'type-fest';

import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  type DocumentEventAttributeValue,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  MassSubtype,
} from '@carrot-fndn/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
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
): Document => {
  const externalEvents =
    partialDocument?.externalEvents?.map((event) => stubDocumentEvent(event)) ??
    [];

  return {
    ...random<Document>(),
    category: stubEnumValue(DocumentCategory),
    ...partialDocument,
    externalEvents: [...random<Array<DocumentEvent>>(), ...externalEvents],
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
  partial?: Partial<Required<DocumentReference>>,
): DocumentReference => ({
  ...random<Required<DocumentReference>>(),
  ...partial,
});

export const stubMassValidationDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.MASS_VALIDATION,
  });

export const stubCertificateAuditDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    subtype: DocumentSubtype.PROCESS,
    type: DocumentType.CERTIFICATE_AUDIT,
  });

export const stubCertificateDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    ...partialDocument,
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.CERTIFICATE,
  });

export const stubMassDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    subtype: stubEnumValue(MassSubtype),
    type: DocumentType.ORGANIC,
    ...partialDocument,
    category: DocumentCategory.MASS,
  });

export const stubMassValidationDocumentWithActorAndAttribute = (
  eventName: DocumentEventName,
  attributeName: DocumentEventAttributeName,
  attributeValue: DocumentEventAttributeValue,
  attributePairs: Array<
    [DocumentEventAttributeName, DocumentEventAttributeValue]
  >,
  partialDocument?: PartialDeep<Document>,
) =>
  stubDocument({
    ...stubMassValidationDocument(partialDocument),
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: eventName }, [
        [attributeName, attributeValue],
        ...attributePairs,
      ]),
    ],
  });

export const stubOfferDocument = (
  partialDocument?: PartialDeep<Document>,
): Document =>
  stubDocument({
    category: DocumentCategory.METHODOLOGY,
    type: DocumentType.CREDIT,
    ...partialDocument,
  });

export const stubOfferCertificatesDocument = (
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
