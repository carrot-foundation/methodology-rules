import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
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

  const massIdStubs = new BoldStubsBuilder().build();

  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(recyclerIdentificationTestCases)(
    `should return $resultStatus when $scenario`,
    async ({ events, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = {
        ...massIdStubs.massIdDocumentStub,
        externalEvents: [
          ...(massIdStubs.massIdDocumentStub.externalEvents ?? []),
          ...events,
        ],
      };

      documentLoaderService.mockResolvedValueOnce(document);

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
