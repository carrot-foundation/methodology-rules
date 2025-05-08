import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldStubsBuilder,
  stubBoldCreditOrderDocument,
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

const massIdWithoutCreditStubs = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .build();
const massIdWithCreditStubs = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMassIdCertificateDocuments()
  .createCreditOrderDocument({
    partialDocument: {
      subtype: TRC,
    },
  })
  .build();
const cancelledCreditOrderDocument = stubBoldCreditOrderDocument({
  partialDocument: {
    status: DocumentStatus.CANCELLED,
    subtype: TRC,
  },
});
const massIdWithCancelledCreditOrderDocument = {
  ...massIdWithCreditStubs.massIdDocument,
  externalEvents: [
    ...(massIdWithCreditStubs.massIdDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: RELATED,
      relatedDocument: mapDocumentReference(cancelledCreditOrderDocument),
    }),
  ],
};

export const creditAbsenceTestCases = [
  {
    documents: [massIdWithoutCreditStubs.massIdDocument],
    massIdAuditDocument: massIdWithoutCreditStubs.massIdAuditDocument,
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
        ...massIdWithCreditStubs.creditOrderDocument,
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
      massIdWithCreditStubs.creditOrderDocument,
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
      massIdWithCancelledCreditOrderDocument,
      {
        ...massIdWithCreditStubs.creditOrderDocument,
        status: DocumentStatus.CANCELLED,
      },
      cancelledCreditOrderDocument,
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
      massIdWithCancelledCreditOrderDocument,
      massIdWithCreditStubs.creditOrderDocument,
      cancelledCreditOrderDocument,
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
