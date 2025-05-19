import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubBoldMassIdDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { RecyclerIdentificationProcessor } from './recycler-identification.processor';
import { recyclerIdentificationTestCases } from './recycler-identification.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('RecyclerIdentificationProcessor', () => {
  const ruleDataProcessor = new RecyclerIdentificationProcessor();

  const documentLoaderService = jest.mocked(loadDocument);

  it.each(recyclerIdentificationTestCases)(
    `should return $resultStatus when $scenario`,
    async ({ events, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const massIdDocumentStub = stubBoldMassIdDocument({
        externalEventsMap: events,
      });

      documentLoaderService.mockResolvedValueOnce(massIdDocumentStub);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
