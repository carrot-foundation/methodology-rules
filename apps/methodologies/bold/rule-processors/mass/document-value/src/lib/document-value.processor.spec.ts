import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { DocumentValueProcessor } from './document-value.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('DocumentValueProcessor', () => {
  const ruleDataProcessor = new DocumentValueProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      currentValue: faker.number.float({ min: 1 }),
      resultStatus: RuleOutputStatus.APPROVED,
    },
    {
      currentValue: faker.number.float({ max: 0 }),
      resultStatus: RuleOutputStatus.REJECTED,
    },
  ])(
    `should return output default with resultStatus "$resultStatus"`,
    async ({ currentValue, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = stubDocument({ currentValue });

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );

  it('should return output default with resultStatus REJECTED when the parent document is undefined', async () => {
    const ruleInput = random<RuleInput>();

    delete ruleInput.parentDocumentId;

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: 'Could not load the document with id undefined',
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
