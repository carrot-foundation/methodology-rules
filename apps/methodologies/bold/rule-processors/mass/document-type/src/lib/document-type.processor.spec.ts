import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentType } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DocumentTypeProcessor } from './document-type.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DocumentTypeProcessor', () => {
  const ruleDataProcessor = new DocumentTypeProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it('should return APPROVED when the document type is ORGANIC', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({ type: DocumentType.ORGANIC });

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

  it('should return undefined when the document is not found', async () => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: `Could not load the document with id ${ruleInput.parentDocumentId}`,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
