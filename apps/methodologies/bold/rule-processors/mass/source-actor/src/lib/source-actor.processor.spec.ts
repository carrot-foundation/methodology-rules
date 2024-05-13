import {
  stubDocument,
  stubDocumentWithOneActorType,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventActorType,
} from '@carrot-fndn/methodologies/bold/types';
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

import { SourceActorProcessor } from './source-actor.processor';

jest.mock('@carrot-fndn/shared/document/loader');

describe('SourceActorProcessor', () => {
  const ruleDataProcessor = new SourceActorProcessor();
  const documentLoaderService = jest.mocked(DocumentLoaderService.prototype);

  it.each([
    {
      document: stubDocumentWithOneActorType(DocumentEventActorType.SOURCE),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'has only one actor event that contains source actor type in metadata',
    },
    {
      document: stubDocument(),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'does not have an actor event with source actor type in metadata',
    },
    {
      document: random<Omit<Document, 'category'>>(),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'has invalid type',
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
    const ruleInput = random<RuleInput>();

    delete ruleInput.parentDocumentId;
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
