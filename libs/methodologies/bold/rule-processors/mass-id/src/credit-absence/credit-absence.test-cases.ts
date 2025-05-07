import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldStubsBuilder,
  stubBoldCreditsDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventName,
  DocumentStatus,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { assert } from 'typia';

import { RESULT_COMMENTS } from './credit-absence.processor';
import { CreditAbsenceProcessorErrors } from './credit-absence.processor.errors';

const { RELATED } = DocumentEventName;
const { TRC } = DocumentSubtype;

const processorError = new CreditAbsenceProcessorErrors();

const massIdWithoutCreditsStubs = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .build();
const massIdWithCreditStubs = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createCertificateDocuments()
  .createCreditsDocument({
    partialDocument: {
      subtype: TRC,
    },
  })
  .build();
const cancelledCreditsDocument = stubBoldCreditsDocument({
  partialDocument: {
    status: DocumentStatus.CANCELLED,
    subtype: TRC,
  },
});
const massIdWithCancelledCreditsDocument = {
  ...massIdWithCreditStubs.massIdDocument,
  externalEvents: [
    ...(massIdWithCreditStubs.massIdDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: RELATED,
      relatedDocument: mapDocumentReference(cancelledCreditsDocument),
    }),
  ],
};

export const creditAbsenceTestCases = [
  {
    documents: [massIdWithoutCreditsStubs.massIdDocument],
    massIdAuditDocument: massIdWithoutCreditsStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED(
      assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'no Credit is linked to the MassID',
  },
  {
    documents: [
      massIdWithCreditStubs.massIdDocument,
      {
        ...massIdWithCreditStubs.creditsDocument,
        status: DocumentStatus.CANCELLED,
      },
    ] as Document[],
    massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED(
      assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'there is a Credit linked to the MassID, but it is cancelled',
  },
  {
    documents: [
      massIdWithCreditStubs.massIdDocument,
      massIdWithCreditStubs.creditsDocument,
    ],
    massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
        assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'a no Cancelled Credit is linked to the MassID',
  },
  {
    documents: [
      massIdWithCancelledCreditsDocument,
      {
        ...massIdWithCreditStubs.creditsDocument,
        status: DocumentStatus.CANCELLED,
      },
      cancelledCreditsDocument,
    ],
    massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED(
      assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'there are more than one Credit linked to the MassID, but all are cancelled',
  },
  {
    documents: [
      massIdWithCancelledCreditsDocument,
      massIdWithCreditStubs.creditsDocument,
      cancelledCreditsDocument,
    ],
    massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
        assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'there are more than one Credit linked to the MassID, but one is not cancelled',
  },
];
