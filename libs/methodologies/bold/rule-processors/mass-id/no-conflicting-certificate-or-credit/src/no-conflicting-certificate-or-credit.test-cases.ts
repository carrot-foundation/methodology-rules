import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  BoldStubsBuilder,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldMethodologySlug,
  type Document,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { MethodologyDocumentStatus } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './no-conflicting-certificate-or-credit.constants';
import { NoConflictingCertificateOrCreditProcessorErrors } from './no-conflicting-certificate-or-credit.processor.errors';

const processorError = new NoConflictingCertificateOrCreditProcessorErrors();

const openDocumentField = {
  partialDocument: {
    status: MethodologyDocumentStatus.OPEN,
  },
};

const simpleMassIDStubs = new BoldStubsBuilder({
  methodologyName: 'BOLD Recycling',
})
  .createMassIDDocuments(openDocumentField)
  .createMassIDAuditDocuments(openDocumentField)
  .build();
const massIDWithAuditStubs = new BoldStubsBuilder({
  methodologyName: 'BOLD Recycling',
})
  .createMassIDDocuments(openDocumentField)
  .createMassIDAuditDocuments(openDocumentField)
  .createMassIDCertificateDocuments(openDocumentField)
  .build();

const massIDWithCreditsStubs = new BoldStubsBuilder({
  methodologyName: 'BOLD Recycling',
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
      name: 'RELATED',
      relatedDocument: mapDocumentRelation(duplicatedMassIDAuditDocument),
    }),
  ],
};

const boldCarbonEventName = 'BOLD Carbon Methodology';
const massIDAuditForOtherMethodology: Document = {
  ...duplicatedMassIDAuditDocument,
  externalEvents: [
    ...(duplicatedMassIDAuditDocument.externalEvents?.filter(
      (event) => !event.name.includes('BOLD Recycling'),
    ) ?? []),
    stubDocumentEventWithMetadataAttributes(
      {
        name: boldCarbonEventName,
      },
      [['Methodology Slug', BoldMethodologySlug['bold-carbon']]],
    ),
  ],
};
const massIDWithAuditDocumentsForDifferentMethodologies: Document = {
  ...simpleMassIDStubs.massIDDocument,
  externalEvents: [
    ...(simpleMassIDStubs.massIDDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: 'RELATED',
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
          'BOLD Recycling',
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
          'BOLD Recycling',
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
          'RecycledID',
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
          status: MethodologyDocumentStatus.CANCELLED,
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
          status: MethodologyDocumentStatus.CANCELLED,
        },
        {
          ...massIDWithCreditsStubs.creditOrderDocument,
          status: MethodologyDocumentStatus.CANCELLED,
        },
      ],
      massIDAuditDocument: massIDWithAuditStubs.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.NO_CONFLICTING_CERTIFICATE,
      resultStatus: 'PASSED',
      scenario: 'The MassID has a cancelled credit document',
    },
  ];
