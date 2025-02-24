import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { WasteOriginIdentifiedProcessor } from './waste-origin-identified.processor';
import { stubDocumentWithWasteOriginIdentified } from './waste-origin-identified.stubs';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('WasteOriginIdentifiedProcessor', () => {
  const ruleDataProcessor = new WasteOriginIdentifiedProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it('should return APPROVED when the document has waste origin identified value true', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocumentWithWasteOriginIdentified();

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
