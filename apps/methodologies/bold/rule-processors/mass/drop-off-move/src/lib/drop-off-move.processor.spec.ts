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
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DropOffMoveProcessor } from './drop-off-move.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('DropOffMoveProcessor', () => {
  const ruleDataProcessor = new DropOffMoveProcessor();
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
                  value: DocumentEventMoveType.DROP_OFF,
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'a MOVE event with a MOVE_TYPE attribute with a DROP_OFF value',
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
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'a MOVE event with a MOVE_TYPE attribute without a DROP_OFF value',
    },
  ])(`$scenario`, async ({ document, resultComment, resultStatus }) => {
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
  });
});
