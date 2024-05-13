import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventActorType,
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
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { SameSourceAndPickUpAddressesProcessor } from './same-source-and-pick-up-addresses.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('SameSourceAndPickUpAddressProcessor', () => {
  const ruleDataProcessor = new SameSourceAndPickUpAddressesProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { ACTOR, MOVE, OPEN } = DocumentEventName;
  const { ACTOR_TYPE, MOVE_TYPE } = DocumentEventAttributeName;
  const { PICK_UP } = DocumentEventMoveType;
  const { SOURCE } = DocumentEventActorType;

  const addressId = faker.string.uuid();

  const commonExternalEvents = [
    stubDocumentEventWithMetadataAttributes(
      {
        address: { id: addressId },
        name: OPEN,
      },
      [[MOVE_TYPE, PICK_UP]],
    ),
    stubDocumentEventWithMetadataAttributes(
      {
        address: { id: addressId },
        name: ACTOR,
      },
      [[ACTOR_TYPE, SOURCE]],
    ),
  ];

  it.each([
    {
      document: stubDocument({
        externalEvents: commonExternalEvents,
      }),
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return returnValue true when event OPEN is/has a move-type, the actor is a source, and addresses match',
    },
    {
      document: stubDocument({
        externalEvents: [],
      }),
      resultComment:
        SameSourceAndPickUpAddressesProcessor.resultComments.ruleNotApplicable,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return returnValue true when neither MOVE nor OPEN event is present',
    },
    {
      document: stubDocument({
        externalEvents: [
          ...commonExternalEvents,
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: addressId },
              name: MOVE,
            },
            [[MOVE_TYPE, PICK_UP]],
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return returnValue true when there is MOVE and OPEN event, actor is source and addresses match',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: addressId },
              name: MOVE,
            },
            [[MOVE_TYPE, PICK_UP]],
          ),
        ],
      }),
      resultComment:
        SameSourceAndPickUpAddressesProcessor.resultComments.noSourceActorEvent,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return returnValue false when there is no actor event with actor type source',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: addressId },
              name: MOVE,
            },
            [[MOVE_TYPE, PICK_UP]],
          ),
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: faker.string.uuid() },
              name: ACTOR,
            },
            [[ACTOR_TYPE, SOURCE]],
          ),
        ],
      }),
      resultComment:
        SameSourceAndPickUpAddressesProcessor.resultComments.doNotMatch,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return returnValue false when addresses do not match',
    },
    {
      document: undefined,
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return returnValue undefined when document is not found',
    },
  ])('$scenario', async ({ document, resultComment, resultStatus }) => {
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
