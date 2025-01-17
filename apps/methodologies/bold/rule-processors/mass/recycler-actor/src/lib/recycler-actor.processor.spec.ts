import {
  stubDocument,
  stubDocumentWithOneActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type Document,
  DocumentEventActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  DocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { RecyclerActorProcessor } from './recycler-actor.processor';

jest.mock('@carrot-fndn/shared/document/loader');

describe('RecyclerActorProcessor', () => {
  const ruleDataProcessor = new RecyclerActorProcessor();
  const documentLoaderService = jest.mocked(DocumentLoaderService.prototype);

  it.each([
    {
      document: stubDocumentWithOneActorType(DocumentEventActorType.RECYCLER),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'has a recycler actor type',
    },
    {
      document: stubDocument(),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'is random',
    },
    {
      document: random<Omit<Document, 'category'>>(),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'is random and does not have a category',
    },
  ])(
    `should return "$resultStatus" when the document $scenario`,
    async ({ document, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const documentEntity = {
        ...stubDocumentEntity(),
        document,
      };

      documentLoaderService.load.mockResolvedValueOnce(documentEntity);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );

  it('should return output default with resultStatus REJECTED when parentDocumentId is null', async () => {
    const ruleInput = random<Omit<RuleInput, 'parentDocumentId'>>();

    const documentEntity = stubDocumentEntity();

    documentLoaderService.load.mockResolvedValueOnce(documentEntity);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
