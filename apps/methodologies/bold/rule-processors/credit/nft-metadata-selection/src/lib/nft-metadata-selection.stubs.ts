import type { RequiredDeep } from 'type-fest';

import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

const { OPEN, OUTPUT, RELATED } = DocumentEventName;
const { METHODOLOGY_DESCRIPTION, METHODOLOGY_NAME } =
  DocumentEventAttributeName;

export const stubDocumentOutputEvent = (
  documentReference: DocumentReference,
): DocumentEvent => ({
  ...stubDocumentEvent(),
  name: OUTPUT,
  relatedDocument: documentReference,
});

export const stubDocumentRelatedEvent = (
  documentReference: DocumentReference,
): DocumentEvent => ({
  ...stubDocumentEvent(),
  name: RELATED,
  relatedDocument: documentReference,
});

export const stubMethodologyDefinitionDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  externalEvents: [
    ...stubArray(stubDocumentEvent),
    stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
      [METHODOLOGY_DESCRIPTION, faker.lorem.sentence()],
      [METHODOLOGY_NAME, faker.lorem.word()],
    ]),
    ...(partialDocument?.externalEvents ?? []),
  ],
  type: DocumentType.DEFINITION,
});

export const stubMassCertificateDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.MASS_CERTIFICATE,
});

export const stubMassCertificateAuditDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.PROCESS,
  type: DocumentType.MASS_CERTIFICATE_AUDIT,
});

export const stubCreditDocument = (partialDocument?: Partial<Document>) => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.CREDIT,
});

export const stubMassAuditDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.MASS_AUDIT,
});

export const stubMassDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.MASS,
});

export const stubCreditCertificatesDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.GROUP,
  type: DocumentType.CREDIT_CERTIFICATES,
});
