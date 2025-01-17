import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import { stubDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import { DocumentCategory } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DocumentCategoryProcessor } from './document-category.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('DocumentCategoryProcessor', () => {
  const ruleDataProcessor = new DocumentCategoryProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it('should return returnValue true when the document category is Mass', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({ category: DocumentCategory.MASS });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
