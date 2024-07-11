import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { PickUpMoveProcessor } from './pick-up-move.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('PickUpMoveProcessor', () => {
  const ruleDataProcessor = new PickUpMoveProcessor();
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
                  value: DocumentEventMoveType.PICK_UP,
                },
              ],
            },
            name: random<DocumentEventName.OPEN>(),
          }),
        ],
      }),
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'a OPEN event with PICK_UP attribute',
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
                  value: DocumentEventMoveType.SHIPMENT_REQUEST,
                },
              ],
            },
            name: random<DocumentEventName.OPEN>(),
          }),
        ],
      }),
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'a OPEN event with SHIPMENT_REQUEST attribute',
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
                  value: DocumentEventMoveType.WEIGHING,
                },
              ],
            },
            name: random<DocumentEventName.OPEN>(),
          }),
        ],
      }),
      resultComment: PickUpMoveProcessor.resultComment.eventNotFound,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'The OPEN event with metadata move-type = Pick-up or Shipment-request was not found',
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
