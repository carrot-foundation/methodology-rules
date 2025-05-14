import {
  BoldStubsBuilder,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldMethodologyName,
  type Document,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentStatus } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './certificate-uniqueness-check.processor';
import { CertificateUniquenessCheckProcessorErrors } from './certificate-uniqueness-check.processor.errors';

const { RELATED } = DocumentEventName;
const { RECYCLING } = BoldMethodologyName;

const processorError = new CertificateUniquenessCheckProcessorErrors();

const openDocumentField = {
  partialDocument: {
    status: MethodologyDocumentStatus.OPEN,
  },
};

const simpleMassIdStubs = new BoldStubsBuilder({
  methodologyName: RECYCLING,
})
  .createMassIdDocuments(openDocumentField)
  .createMassIdAuditDocuments(openDocumentField)
  .build();
const massIdWithAuditStubs = new BoldStubsBuilder({
  methodologyName: RECYCLING,
})
  .createMassIdDocuments(openDocumentField)
  .createMassIdAuditDocuments(openDocumentField)
  .createMassIdCertificateDocuments(openDocumentField)
  .build();

const massIdWithCreditsStubs = new BoldStubsBuilder({
  methodologyName: RECYCLING,
})
  .createMassIdDocuments(openDocumentField)
  .createMassIdAuditDocuments(openDocumentField)
  .createMassIdCertificateDocuments(openDocumentField)
  .createCreditOrderDocument(openDocumentField)
  .build();

const duplicatedMassIdAuditDocument: Document = {
  ...simpleMassIdStubs.massIdAuditDocument,
  id: faker.string.uuid(),
};

const massIdWithTwoAuditDocuments: Document = {
  ...simpleMassIdStubs.massIdDocument,
  externalEvents: [
    ...(simpleMassIdStubs.massIdDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: RELATED,
      referencedDocument: undefined,
      relatedDocument: mapDocumentReference(duplicatedMassIdAuditDocument),
    }),
  ],
};

export const certificateUniquenessCheckTestCases = [
  {
    documents: [simpleMassIdStubs.massIdDocument],
    massIdAuditDocument: simpleMassIdStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'no Credit is linked to the MassID',
  },
  {
    documents: [
      massIdWithTwoAuditDocuments,
      simpleMassIdStubs.massIdAuditDocument,
      duplicatedMassIdAuditDocument,
    ],
    massIdAuditDocument: simpleMassIdStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME(
        BoldMethodologyName.RECYCLING,
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'has an approved MassID audit document for the same methodology name',
  },
  {
    documents: [
      massIdWithAuditStubs.massIdDocument,
      massIdWithAuditStubs.massIdAuditDocument,
      massIdWithAuditStubs.massIdCertificateDocument,
    ],
    massIdAuditDocument: massIdWithAuditStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT(
        DocumentType.RECYCLED_ID,
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'has a valid certificate document of the specified type',
  },
  {
    documents: [
      massIdWithCreditsStubs.massIdDocument,
      massIdWithCreditsStubs.massIdAuditDocument,
      massIdWithCreditsStubs.massIdCertificateDocument,
      massIdWithCreditsStubs.creditOrderDocument,
    ],
    massIdAuditDocument: massIdWithCreditsStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'has a valid credit document',
  },
  {
    documents: [
      massIdWithAuditStubs.massIdDocument,
      massIdWithAuditStubs.massIdAuditDocument,
      {
        ...massIdWithAuditStubs.massIdCertificateDocument,
        status: MethodologyDocumentStatus.CANCELLED,
      },
    ],
    massIdAuditDocument: massIdWithAuditStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'has cancelled certificate document',
  },
  {
    documents: [
      massIdWithAuditStubs.massIdDocument,
      massIdWithAuditStubs.massIdAuditDocument,
      {
        ...massIdWithAuditStubs.massIdCertificateDocument,
        status: MethodologyDocumentStatus.CANCELLED,
      },
      {
        ...massIdWithCreditsStubs.creditOrderDocument,
        status: MethodologyDocumentStatus.CANCELLED,
      },
    ],
    massIdAuditDocument: massIdWithAuditStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'has cancelled credit document',
  },
];
