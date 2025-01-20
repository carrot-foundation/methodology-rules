import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { SameRecyclerAndDropOffAddressesProcessor } from './same-recycler-and-drop-off-addresses.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('SameRecyclerAndDropOffAddressesProcessor', () => {
  const ruleDataProcessor = new SameRecyclerAndDropOffAddressesProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { ACTOR_TYPE, MOVE_TYPE } = DocumentEventAttributeName;
  const { DROP_OFF } = DocumentEventMoveType;
  const { RECYCLER } = DocumentEventActorType;

  it.each([
    {
      document: undefined,
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'there is no document',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: DocumentEventName.MOVE },
            [[MOVE_TYPE, DROP_OFF]],
          ),
        ],
      }),
      resultComment:
        SameRecyclerAndDropOffAddressesProcessor.resultComment
          .recyclerActorEventNotFound,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'recyclerActorEvent is not found',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: DocumentEventName.OPEN },
            [[ACTOR_TYPE, RECYCLER]],
          ),
        ],
      }),
      resultComment:
        SameRecyclerAndDropOffAddressesProcessor.resultComment
          .moveTypeEventNotFound,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'moveTypeEvent is not found',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: 'address_id' },
              name: DocumentEventName.MOVE,
            },
            [
              [MOVE_TYPE, DROP_OFF],
              [ACTOR_TYPE, RECYCLER],
            ],
          ),
        ],
      }),
      resultComment:
        SameRecyclerAndDropOffAddressesProcessor.resultComment.addressMatches,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'moveTypeEvent and recyclerActorEvent have the same address IDs',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: DocumentEventName.MOVE },
            [[MOVE_TYPE, DROP_OFF]],
          ),
          stubDocumentEventWithMetadataAttributes(
            { name: DocumentEventName.ACTOR },
            [[ACTOR_TYPE, RECYCLER]],
          ),
        ],
      }),
      resultComment:
        SameRecyclerAndDropOffAddressesProcessor.resultComment
          .addressDoesNotMatch,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'moveTypeEvent and recyclerActorEvent have different address IDs',
    },
  ])(
    'should return $resultStatus if $scenario',
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
});
