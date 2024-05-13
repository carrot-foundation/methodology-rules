import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventAttribute,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import {
  DocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { HasMtrProcessor } from './has-mtr.processor';

jest.mock('@carrot-fndn/shared/document/loader');

describe('HasMtrProcessor', () => {
  const ruleDataProcessor = new HasMtrProcessor();
  const documentLoaderService = jest.mocked(DocumentLoaderService.prototype);

  it.each([
    {
      document: undefined as unknown as Document,
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'is undefined',
    },
    {
      document: random<Omit<Document, 'category'>>(),
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'has invalid type',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: stubArray(() => stubDocumentEventAttribute()),
            },
            name: DocumentEventName.OPEN,
          }),
        ],
      }),
      resultComment: HasMtrProcessor.RESULT_COMMENT.attributeNotFound,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'does not have metadata attribute has-mtr in open event',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                stubDocumentEventAttribute({
                  name: 'has-mtr',
                  value: random<string>(),
                }),
              ],
            },
            name: DocumentEventName.OPEN,
          }),
        ],
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'metadata attribute has-mtr is noy a boolean',
    },
  ])(
    `should return "$resultStatus" when the document $scenario`,
    async ({ document, resultComment, resultStatus }) => {
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
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
