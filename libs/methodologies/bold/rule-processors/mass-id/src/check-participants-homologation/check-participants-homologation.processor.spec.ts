import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { CheckParticipantsHomologationProcessor } from './check-participants-homologation.processor';
import { checkParticipantsHomologationTestCases } from './check-participants-homologation.test-cases';

describe('CheckParticipantsHomologationProcessor', () => {
  const ruleDataProcessor = new CheckParticipantsHomologationProcessor();

  it.each(checkParticipantsHomologationTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      documents,
      massIdAuditDocumentStub,
      resultComment,
      resultStatus,
    }) => {
      spyOnDocumentQueryServiceLoad(stubDocument(), [
        massIdAuditDocumentStub,
        ...documents,
      ]);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocumentStub.id,
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
