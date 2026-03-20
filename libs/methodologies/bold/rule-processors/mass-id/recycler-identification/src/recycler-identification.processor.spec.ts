import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubBoldMassIDDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { RecyclerIdentificationProcessor } from './recycler-identification.processor';
import { recyclerIdentificationTestCases } from './recycler-identification.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('RecyclerIdentificationProcessor', () => {
  const ruleDataProcessor = new RecyclerIdentificationProcessor();

  const documentLoaderService = vi.mocked(loadDocument);

  it.each(recyclerIdentificationTestCases)(
    `should return $resultStatus when $scenario`,
    async ({ events, resultComment, resultStatus }) => {
      const ruleInput = stubRuleInput();
      const massIDDocumentStub = stubBoldMassIDDocument({
        externalEventsMap: events,
      });

      documentLoaderService.mockResolvedValueOnce(massIDDocumentStub);

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
