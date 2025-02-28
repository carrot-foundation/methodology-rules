import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldStubsBuilder,
  stubDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentStatus,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { assert, random } from 'typia';

import { CreditAbsenceProcessor } from './credit-absence.processor';
import { CreditAbsenceProcessorErrors } from './credit-absence.processor.errors';

describe('CreditAbsenceProcessor', () => {
  const ruleDataProcessor = new CreditAbsenceProcessor(TRC_CREDIT_MATCH);
  const processorError = new CreditAbsenceProcessorErrors();

  const massIdWithCreditStubs = new BoldStubsBuilder().withCredits().build();
  const massIdWithoutCreditsStubs = new BoldStubsBuilder().build();
  const massIdWithMultipleCreditsStubs = new BoldStubsBuilder()
    .withCredits({
      count: 4,
    })
    .build();

  it.each([
    {
      documents: [massIdWithoutCreditsStubs.massIdDocumentStub],
      massIdAuditDocument: massIdWithoutCreditsStubs.massIdAuditDocumentStub,
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED when no Credit is linked to the MassID',
    },
    {
      documents: [
        massIdWithCreditStubs.massIdDocumentStub,
        {
          ...massIdWithCreditStubs.creditDocumentsStubs[0],
          status: DocumentStatus.CANCELLED,
        } as Document,
      ],
      massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocumentStub,
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when there is a Credit linked to the MassID, but it is cancelled',
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
      scenario:
        'should return REJECTED when a no Cancelled Credit is linked to the MassID',
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
      massIdAuditDocument:
        massIdWithMultipleCreditsStubs.massIdAuditDocumentStub,
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when there are more than one Credit linked to the MassID, but all are cancelled',
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
      massIdAuditDocument:
        massIdWithMultipleCreditsStubs.massIdAuditDocumentStub,
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
          assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when there are more than one Credit linked to the MassID, but one is not cancelled',
    },
  ])(
    '$scenario',
    async ({ documents, massIdAuditDocument, resultComment, resultStatus }) => {
      spyOnDocumentQueryServiceLoad(stubDocument(), [
        ...documents,
        massIdAuditDocument,
      ]);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocument.id,
      };

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
