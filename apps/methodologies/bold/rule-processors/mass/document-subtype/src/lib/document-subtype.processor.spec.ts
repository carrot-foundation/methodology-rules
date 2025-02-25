import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentSubtype } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { DocumentSubtypeProcessor } from './document-subtype.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DocumentSubtypeProcessor', () => {
  const ruleDataProcessor = new DocumentSubtypeProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it('should return returnValue true when document subtype is allowed', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const documentSubtype = random<DocumentSubtype>();

    const documentEntity = stubDocument({ subtype: documentSubtype });

    documentLoaderService.mockResolvedValueOnce(documentEntity);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return returnValue false when document subtype is not allowed', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const documentSubtype = faker.string.sample();
    const documentEntity = stubDocument({ subtype: documentSubtype });

    documentLoaderService.mockResolvedValueOnce(documentEntity);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: 'Document subtype is not allowed by the BOLD Methodology',
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
