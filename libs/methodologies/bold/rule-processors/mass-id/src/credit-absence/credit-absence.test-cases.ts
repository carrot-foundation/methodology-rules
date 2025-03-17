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
  .createMassIdDocument()
  .createMassIdAuditDocument()
  .build();
const massIdWithCreditStubs = new BoldStubsBuilder()
  .createMassIdDocument()
  .createMassIdAuditDocument()
  .withCredits()
  .build();
const massIdWithMultipleCreditsStubs = new BoldStubsBuilder()
  .createMassIdDocument()
  .createMassIdAuditDocument()
  .withCredits({
    count: 4,
  })
  .build();

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
        ...massIdWithCreditStubs.creditDocuments[0],
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
      ...massIdWithCreditStubs.creditDocuments,
    ],
    massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
        assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'when a no Cancelled Credit is linked to the MassID',
  },
  {
    documents: [
      massIdWithMultipleCreditsStubs.massIdDocument,
      ...massIdWithMultipleCreditsStubs.creditDocuments.map(
        (creditDocument: Document) => ({
          ...creditDocument,
          status: DocumentStatus.CANCELLED,
        }),
      ),
    ],
    massIdAuditDocument: massIdWithMultipleCreditsStubs.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED(
      assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'there are more than one Credit linked to the MassID, but all are cancelled',
  },
  {
    documents: [
      massIdWithMultipleCreditsStubs.massIdDocument,
      ...massIdWithMultipleCreditsStubs.creditDocuments.map(
        (creditDocument: Document, index: number) => ({
          ...creditDocument,
          status:
            index === 0 ? random<NonEmptyString>() : DocumentStatus.CANCELLED,
        }),
      ),
    ],
    massIdAuditDocument: massIdWithMultipleCreditsStubs.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
        assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'there are more than one Credit linked to the MassID, but one is not cancelled',
  },
];
