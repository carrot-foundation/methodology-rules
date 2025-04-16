import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { LocalWasteClassificationProcessor } from './local-waste-classification.processor';
import { localWasteClassificationTestCases } from './local-waste-classification.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('LocalWasteClassificationProcessor', () => {
  const ruleDataProcessor = new LocalWasteClassificationProcessor();

  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(localWasteClassificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultContent, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: events,
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultContent,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
