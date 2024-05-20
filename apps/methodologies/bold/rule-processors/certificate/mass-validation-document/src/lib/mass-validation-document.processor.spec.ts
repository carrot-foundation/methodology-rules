import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubCertificateAuditWithMethodologySlug,
  stubDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { MassValidationDocumentProcessor } from './mass-validation-document.processor';
import { stubMassValidationDocumentWithMethodologySlug } from './mass-validation-document.stubs';

describe('MassValidationDocumentProcessor', () => {
  const ruleDataProcessor = new MassValidationDocumentProcessor();

  const methodologySlug = faker.string.sample();

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
        () => stubMassValidationDocumentWithMethodologySlug(),
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
        () => stubMassValidationDocumentWithMethodologySlug(methodologySlug),
        { max: 10, min: 2 },
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'matches mass validation and have correct methodology slug',
    },
  ])(
    `should return "$resultStatus" when the documents $scenario`,
    async ({ relatedDocumentsOfParentDocument, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      spyOnDocumentQueryServiceLoad(
        stubCertificateAuditWithMethodologySlug(methodologySlug),
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
