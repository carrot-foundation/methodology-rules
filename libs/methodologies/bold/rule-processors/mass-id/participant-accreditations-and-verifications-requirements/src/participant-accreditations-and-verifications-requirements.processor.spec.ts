import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { ParticipantAccreditationsAndVerificationsRequirementsProcessor } from './participant-accreditations-and-verifications-requirements.processor';
import { participantAccreditationsAndVerificationsRequirementsTestCases } from './participant-accreditations-and-verifications-requirements.test-cases';

describe('ParticipantAccreditationsAndVerificationsRequirementsProcessor', () => {
  const ruleDataProcessor =
    new ParticipantAccreditationsAndVerificationsRequirementsProcessor();

  it.each(participantAccreditationsAndVerificationsRequirementsTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIDAuditDocument, resultComment, resultStatus }) => {
      spyOnDocumentQueryServiceLoad(stubDocument(), [
        massIDAuditDocument,
        ...documents,
      ]);

      const ruleInput = stubRuleInput({
        documentId: massIDAuditDocument.id,
      });

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
