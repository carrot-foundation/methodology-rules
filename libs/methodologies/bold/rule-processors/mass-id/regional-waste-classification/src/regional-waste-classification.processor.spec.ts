import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { RegionalWasteClassificationProcessor } from './regional-waste-classification.processor';
import { regionalWasteClassificationTestCases } from './regional-waste-classification.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('RegionalWasteClassificationProcessor', () => {
  const ruleDataProcessor = new RegionalWasteClassificationProcessor();

  const documentLoaderService = jest.mocked(loadDocument);

  it.each(regionalWasteClassificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      events,
      partialDocument,
      resultComment,
      resultContent,
      resultStatus,
    }) => {
      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
          externalEventsMap: events,
          partialDocument,
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
