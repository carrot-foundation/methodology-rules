import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { CreditAbsenceProcessor } from './credit-absence.processor';
import { creditAbsenceTestCases } from './credit-absence.test-cases';

describe('CreditAbsenceProcessor', () => {
  const ruleDataProcessor = new CreditAbsenceProcessor(TRC_CREDIT_MATCH);

  // const massIdWithCreditStubs = new BoldStubsBuilder()
  //   .createMassIdDocumentStub()
  //   .createMassIdAuditDocumentStub()
  //   .withCredits()
  //   .build();
  // const massIdWithoutCreditsStubs = new BoldStubsBuilder()
  //   .createMassIdDocumentStub()
  //   .createMassIdAuditDocumentStub()
  //   .build();
  // const massIdWithMultipleCreditsStubs = new BoldStubsBuilder()
  //   .createMassIdDocumentStub()
  //   .createMassIdAuditDocumentStub()
  //   .withCredits({
  //     count: 4,
  //   })
  //   .build();

  it.each(creditAbsenceTestCases)(
    'should return $resultStatus when $scenario',
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
