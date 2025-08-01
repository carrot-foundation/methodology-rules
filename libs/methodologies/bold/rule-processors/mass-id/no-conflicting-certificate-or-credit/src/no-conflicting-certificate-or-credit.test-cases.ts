import {
  BoldStubsBuilder,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldMethodologyName,
  BoldMethodologySlug,
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentStatus } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './no-conflicting-certificate-or-credit.processor';
import { NoConflictingCertificateOrCreditProcessorErrors } from './no-conflicting-certificate-or-credit.processor.errors';

const { RELATED } = DocumentEventName;
const { CARBON, RECYCLING } = BoldMethodologyName;
const { METHODOLOGY_SLUG } = DocumentEventAttributeName;

const processorError = new NoConflictingCertificateOrCreditProcessorErrors();

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
      relatedDocument: mapDocumentRelation(duplicatedMassIdAuditDocument),
    }),
  ],
};

const boldCarbonEventName = `${CARBON} Methodology`;
const massIdAuditForOtherMethodology: Document = {
  ...duplicatedMassIdAuditDocument,
  externalEvents: [
    ...(duplicatedMassIdAuditDocument.externalEvents?.filter(
      (event) => !event.name.includes(RECYCLING),
    ) ?? []),
    stubDocumentEventWithMetadataAttributes(
      {
        name: boldCarbonEventName,
      },
      [[METHODOLOGY_SLUG, BoldMethodologySlug.CARBON]],
    ),
  ],
};
const massIdWithAuditDocumentsForDifferentMethodologies: Document = {
  ...simpleMassIdStubs.massIdDocument,
  externalEvents: [
    ...(simpleMassIdStubs.massIdDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: RELATED,
      relatedDocument: mapDocumentRelation(massIdAuditForOtherMethodology),
    }),
  ],
};

export const noConflictingCertificateOrCreditTestCases = [
  {
    documents: [simpleMassIdStubs.massIdDocument],
    massIdAuditDocument: simpleMassIdStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
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
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'has an approved MassID audit document for the same methodology name',
  },
  {
    documents: [
      massIdWithTwoAuditDocuments,
      simpleMassIdStubs.massIdAuditDocument,
      {
        ...duplicatedMassIdAuditDocument,
        externalEvents: [
          ...(duplicatedMassIdAuditDocument.externalEvents?.filter(
            (event) => !event.name.includes(RuleOutputStatus.PASSED),
          ) ?? []),
        ],
      },
    ],
    massIdAuditDocument: simpleMassIdStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME(
        BoldMethodologyName.RECYCLING,
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'has an in-progress MassID audit document for the same methodology name',
  },
  {
    documents: [
      massIdAuditForOtherMethodology,
      simpleMassIdStubs.massIdAuditDocument,
      massIdWithAuditDocumentsForDifferentMethodologies,
    ],
    massIdAuditDocument: simpleMassIdStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'has an approved MassID Audit document for a different methodology',
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
    resultStatus: RuleOutputStatus.FAILED,
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
    resultStatus: RuleOutputStatus.FAILED,
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
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
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
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'has cancelled credit document',
  },
];
