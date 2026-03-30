import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

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
import { DocumentStatus } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './no-conflicting-certificate-or-credit.constants';
import { NoConflictingCertificateOrCreditProcessorErrors } from './no-conflicting-certificate-or-credit.processor.errors';

const { RELATED } = DocumentEventName;
const { CARBON, RECYCLING } = BoldMethodologyName;
const { METHODOLOGY_SLUG } = DocumentEventAttributeName;

const processorError = new NoConflictingCertificateOrCreditProcessorErrors();

const openDocumentField = {
  partialDocument: {
    status: DocumentStatus.OPEN,
  },
};

const simpleMassIDStubs = new BoldStubsBuilder({
  methodologyName: RECYCLING,
})
  .createMassIDDocuments(openDocumentField)
  .createMassIDAuditDocuments(openDocumentField)
  .build();
const massIDWithAuditStubs = new BoldStubsBuilder({
  methodologyName: RECYCLING,
})
  .createMassIDDocuments(openDocumentField)
  .createMassIDAuditDocuments(openDocumentField)
  .createMassIDCertificateDocuments(openDocumentField)
  .build();

const massIDWithCreditsStubs = new BoldStubsBuilder({
  methodologyName: RECYCLING,
})
  .createMassIDDocuments(openDocumentField)
  .createMassIDAuditDocuments(openDocumentField)
  .createMassIDCertificateDocuments(openDocumentField)
  .createCreditOrderDocument(openDocumentField)
  .build();

const duplicatedMassIDAuditDocument: Document = {
  ...simpleMassIDStubs.massIDAuditDocument,
  id: faker.string.uuid(),
};

const massIDWithTwoAuditDocuments: Document = {
  ...simpleMassIDStubs.massIDDocument,
  externalEvents: [
    ...(simpleMassIDStubs.massIDDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: RELATED,
      relatedDocument: mapDocumentRelation(duplicatedMassIDAuditDocument),
    }),
  ],
};

const boldCarbonEventName = `${CARBON} Methodology`;
const massIDAuditForOtherMethodology: Document = {
  ...duplicatedMassIDAuditDocument,
  externalEvents: [
    ...(duplicatedMassIDAuditDocument.externalEvents?.filter(
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
const massIDWithAuditDocumentsForDifferentMethodologies: Document = {
  ...simpleMassIDStubs.massIDDocument,
  externalEvents: [
    ...(simpleMassIDStubs.massIDDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: RELATED,
      relatedDocument: mapDocumentRelation(massIDAuditForOtherMethodology),
    }),
  ],
};

interface NoConflictingCertificateOrCreditTestCase extends RuleTestCase {
  documents: Document[];
  massIDAuditDocument: Document;
}

export const noConflictingCertificateOrCreditTestCases: NoConflictingCertificateOrCreditTestCase[] =
  [
    {
      documents: [simpleMassIDStubs.massIDDocument],
      massIDAuditDocument: simpleMassIDStubs.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.NO_CONFLICTING_CERTIFICATE,
      resultStatus: 'PASSED',
      scenario: 'No credit is linked to the MassID document',
    },
    {
      documents: [
        massIDWithTwoAuditDocuments,
        simpleMassIDStubs.massIDAuditDocument,
        duplicatedMassIDAuditDocument,
      ],
      massIDAuditDocument: simpleMassIDStubs.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME(
          BoldMethodologyName.RECYCLING,
        ),
      resultStatus: 'FAILED',
      scenario:
        'The MassID has an approved audit document for the same methodology name',
    },
    {
      documents: [
        massIDWithTwoAuditDocuments,
        simpleMassIDStubs.massIDAuditDocument,
        {
          ...duplicatedMassIDAuditDocument,
          externalEvents: [
            ...(duplicatedMassIDAuditDocument.externalEvents?.filter(
              (event) => !event.name.includes('PASSED'),
            ) ?? []),
          ],
        },
      ],
      massIDAuditDocument: simpleMassIDStubs.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME(
          BoldMethodologyName.RECYCLING,
        ),
      resultStatus: 'FAILED',
      scenario:
        'The MassID has an in-progress audit document for the same methodology name',
    },
    {
      documents: [
        massIDAuditForOtherMethodology,
        simpleMassIDStubs.massIDAuditDocument,
        massIDWithAuditDocumentsForDifferentMethodologies,
      ],
      massIDAuditDocument: simpleMassIDStubs.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.NO_CONFLICTING_CERTIFICATE,
      resultStatus: 'PASSED',
      scenario:
        'The MassID has an approved audit document for a different methodology',
    },
    {
      documents: [
        massIDWithAuditStubs.massIDDocument,
        massIDWithAuditStubs.massIDAuditDocument,
        massIDWithAuditStubs.massIDCertificateDocument,
      ],
      massIDAuditDocument: massIDWithAuditStubs.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT(
          DocumentType.RECYCLED_ID,
        ),
      resultStatus: 'FAILED',
      scenario:
        'The MassID has a valid certificate document of the specified type',
    },
    {
      documents: [
        massIDWithCreditsStubs.massIDDocument,
        massIDWithCreditsStubs.massIDAuditDocument,
        massIDWithCreditsStubs.massIDCertificateDocument,
        massIDWithCreditsStubs.creditOrderDocument,
      ],
      massIDAuditDocument: massIDWithCreditsStubs.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE
          .MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT,
      resultStatus: 'FAILED',
      scenario: 'The MassID has a valid credit document',
    },
    {
      documents: [
        massIDWithAuditStubs.massIDDocument,
        massIDWithAuditStubs.massIDAuditDocument,
        {
          ...massIDWithAuditStubs.massIDCertificateDocument,
          status: DocumentStatus.CANCELLED,
        },
      ],
      massIDAuditDocument: massIDWithAuditStubs.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.NO_CONFLICTING_CERTIFICATE,
      resultStatus: 'PASSED',
      scenario: 'The MassID has a cancelled certificate document',
    },
    {
      documents: [
        massIDWithAuditStubs.massIDDocument,
        massIDWithAuditStubs.massIDAuditDocument,
        {
          ...massIDWithAuditStubs.massIDCertificateDocument,
          status: DocumentStatus.CANCELLED,
        },
        {
          ...massIDWithCreditsStubs.creditOrderDocument,
          status: DocumentStatus.CANCELLED,
        },
      ],
      massIDAuditDocument: massIDWithAuditStubs.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.NO_CONFLICTING_CERTIFICATE,
      resultStatus: 'PASSED',
      scenario: 'The MassID has a cancelled credit document',
    },
  ];
