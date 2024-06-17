import type { RequiredDeep } from 'type-fest';

import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

const { OPEN, OUTPUT, RELATED } = DocumentEventName;
const { CERTIFICATE_VALUE_LABEL, METHODOLOGY_DESCRIPTION, METHODOLOGY_NAME } =
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
      [CERTIFICATE_VALUE_LABEL, faker.lorem.sentence()],
      [METHODOLOGY_NAME, faker.lorem.word()],
    ]),
    ...(partialDocument?.externalEvents ?? []),
  ],
  type: DocumentType.DEFINITION,
});

export const stubCertificateDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.CERTIFICATE,
});

export const stubCertificateAuditDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.PROCESS,
  type: DocumentType.CERTIFICATE_AUDIT,
});

export const stubCreditDocument = (partialDocument?: Partial<Document>) => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.CREDIT,
});

export const stubMassValidationDocument = (
  partialDocument?: Partial<Document>,
): Document => ({
  ...random<RequiredDeep<Document>>(),
  ...partialDocument,
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.MASS_VALIDATION,
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
