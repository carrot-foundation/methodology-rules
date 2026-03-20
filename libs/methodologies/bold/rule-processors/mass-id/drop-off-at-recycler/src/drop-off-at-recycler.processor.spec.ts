import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { DropOffAtRecyclerProcessor } from './drop-off-at-recycler.processor';
import { dropOffAtRecyclerTestCases } from './drop-off-at-recycler.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DropOffAtRecyclerProcessor', () => {
  const ruleDataProcessor = new DropOffAtRecyclerProcessor();

  const documentLoaderService = vi.mocked(loadDocument);

  it.each(dropOffAtRecyclerTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const { massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: events,
        })
        .build();

      const ruleInput = stubRuleInput();

      documentLoaderService.mockResolvedValueOnce(massIDDocument);

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
