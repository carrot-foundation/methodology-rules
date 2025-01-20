import type { PartialDeep } from 'type-fest';

import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  MassSubtype,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventName,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
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
    subtype: stubEnumValue(MassSubtype),
    type: DocumentType.ORGANIC,
    ...partialDocument,
    category: DocumentCategory.MASS,
  });

export const stubMassAuditDocumentWithActorAndAttribute = (
  eventName: MethodologyDocumentEventName,
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
        { name: MethodologyDocumentEventName.ACTOR },
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
