import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentCategory } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DocumentCategoryProcessor } from './document-category.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

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
