import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { MoveTypeProcessor } from './move-type.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('MoveTypeProcessor', () => {
  const ruleDataProcessor = new MoveTypeProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: true,
                  name: DocumentEventAttributeName.MOVE_TYPE,
                  value: DocumentEventMoveType.WEIGHING,
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'all attributes with correct values',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: true,
                  name: DocumentEventAttributeName.MOVE_TYPE,
                  value: '',
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment:
        MoveTypeProcessor.resultComment.notAllEventsHaveNonEmptyMoveType,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'some attributes with empty values',
    },
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'does not have external events',
    },
  ])(
    `should return $resultStatus when the document has $scenario`,
    async ({ document, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

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

  it('should return REJECTED when the document is undefined', async () => {
    const ruleInput = random<RuleInput>();

    delete ruleInput.parentDocumentId;

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
