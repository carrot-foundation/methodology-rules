import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { MassValidationDocumentProcessor } from './mass-validation-document.processor';
import { stubMassValidationDocumentWithBoldMethodology } from './mass-validation-document.stubs';

describe('MassValidationDocumentProcessor', () => {
  const ruleDataProcessor = new MassValidationDocumentProcessor();

  it.each([
    {
      relatedDocumentsOfParentDocument: stubArray(() => stubDocument(), {
        max: 10,
        min: 2,
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'not matches mass validation',
    },
    {
      relatedDocumentsOfParentDocument: stubArray(
        () => stubMassValidationDocumentWithBoldMethodology(),
        { max: 10, min: 2 },
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'matches mass validation and have bold methodology slug',
    },
  ])(
    `should return "$resultStatus" when the documents $scenario`,
    async ({ relatedDocumentsOfParentDocument, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      spyOnDocumentQueryServiceLoad(relatedDocumentsOfParentDocument);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment:
          resultStatus === RuleOutputStatus.APPROVED
            ? ruleDataProcessor['ResultComment'].APPROVED
            : ruleDataProcessor['ResultComment'].REJECTED(
                relatedDocumentsOfParentDocument.map(({ id }) => id),
              ),
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
