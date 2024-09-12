import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubMassCertificateAuditWithMethodologySlug,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { MassAuditDocumentProcessor } from './mass-validation-document.processor';
import { stubMassAuditDocumentWithMethodologySlug } from './mass-validation-document.stubs';

describe('MassAuditDocumentProcessor', () => {
  const ruleDataProcessor = new MassAuditDocumentProcessor();

  const methodologySlug = faker.string.sample();

  it.each([
    {
      relatedDocumentsOfParentDocument: stubArray(() => stubDocument(), {
        max: 10,
        min: 2,
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'not matches mass audit',
    },
    {
      relatedDocumentsOfParentDocument: stubArray(
        () => stubMassAuditDocumentWithMethodologySlug(),
        {
          max: 10,
          min: 2,
        },
      ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'do not have the correct slug',
    },
    {
      relatedDocumentsOfParentDocument: stubArray(
        () => stubMassAuditDocumentWithMethodologySlug(methodologySlug),
        { max: 10, min: 2 },
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'matches mass audit and have correct methodology slug',
    },
  ])(
    `should return "$resultStatus" when the documents $scenario`,
    async ({ relatedDocumentsOfParentDocument, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      spyOnDocumentQueryServiceLoad(
        stubMassCertificateAuditWithMethodologySlug(methodologySlug),
        relatedDocumentsOfParentDocument,
      );

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
