import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentStatus,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { assert, random } from 'typia';

import { RESULT_COMMENTS } from './credit-absence.processor';
import { CreditAbsenceProcessorErrors } from './credit-absence.processor.errors';

const processorError = new CreditAbsenceProcessorErrors();

const massIdWithoutCreditsStubs = new BoldStubsBuilder()
  .createMassIdDocumentStub()
  .createMassIdAuditDocumentStub()
  .build();
const massIdWithCreditStubs = new BoldStubsBuilder()
  .createMassIdDocumentStub()
  .createMassIdAuditDocumentStub()
  .withCredits()
  .build();
const massIdWithMultipleCreditsStubs = new BoldStubsBuilder()
  .createMassIdDocumentStub()
  .createMassIdAuditDocumentStub()
  .withCredits({
    count: 4,
  })
  .build();

export const creditAbsenceTestCases = [
  {
    documents: [massIdWithoutCreditsStubs.massIdDocumentStub],
    massIdAuditDocument: massIdWithoutCreditsStubs.massIdAuditDocumentStub,
    resultComment: RESULT_COMMENTS.APPROVED(
      assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'no Credit is linked to the MassID',
  },
  {
    documents: [
      massIdWithCreditStubs.massIdDocumentStub,
      {
        ...massIdWithCreditStubs.creditDocumentsStubs[0],
        status: DocumentStatus.CANCELLED,
      },
    ] as Document[],
    massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocumentStub,
    resultComment: RESULT_COMMENTS.APPROVED(
      assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'there is a Credit linked to the MassID, but it is cancelled',
  },
  {
    documents: [
      massIdWithCreditStubs.massIdDocumentStub,
      ...massIdWithCreditStubs.creditDocumentsStubs,
    ],
    massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocumentStub,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
        assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'when a no Cancelled Credit is linked to the MassID',
  },
  {
    documents: [
      massIdWithMultipleCreditsStubs.massIdDocumentStub,
      ...massIdWithMultipleCreditsStubs.creditDocumentsStubs.map(
        (creditDocumentStub: Document) => ({
          ...creditDocumentStub,
          status: DocumentStatus.CANCELLED,
        }),
      ),
    ],
    massIdAuditDocument: massIdWithMultipleCreditsStubs.massIdAuditDocumentStub,
    resultComment: RESULT_COMMENTS.APPROVED(
      assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'there are more than one Credit linked to the MassID, but all are cancelled',
  },
  {
    documents: [
      massIdWithMultipleCreditsStubs.massIdDocumentStub,
      ...massIdWithMultipleCreditsStubs.creditDocumentsStubs.map(
        (creditDocumentStub: Document, index: number) => ({
          ...creditDocumentStub,
          status:
            index === 0 ? random<NonEmptyString>() : DocumentStatus.CANCELLED,
        }),
      ),
    ],
    massIdAuditDocument: massIdWithMultipleCreditsStubs.massIdAuditDocumentStub,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
        assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'there are more than one Credit linked to the MassID, but one is not cancelled',
  },
];
