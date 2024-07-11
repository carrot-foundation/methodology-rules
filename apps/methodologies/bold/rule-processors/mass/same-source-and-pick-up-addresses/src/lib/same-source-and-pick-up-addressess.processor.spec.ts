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

  const { ACTOR } = DocumentEventName;
  const { ACTOR_TYPE, MOVE_TYPE } = DocumentEventAttributeName;
  const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;
  const { SOURCE } = DocumentEventActorType;

  const addressId = faker.string.uuid();

  const evaluateEvent = stubDocumentEventWithMetadataAttributes(
    {
      address: { id: addressId },
      name: random<DocumentEventName>(),
    },
    [[MOVE_TYPE, random<typeof PICK_UP | typeof SHIPMENT_REQUEST>()]],
  );

  const commonExternalEvents = [
    evaluateEvent,
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
        'should return returnValue true when event is/has a move-type with pick-up or shipment-request, the actor is a source, and addresses match',
    },
    {
      document: stubDocument({
        externalEvents: [],
      }),
      resultComment: ruleDataProcessor['ResultComments'].RULE_NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return returnValue true when no event is present',
    },
    {
      document: stubDocument({
        externalEvents: commonExternalEvents,
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return returnValue true when there is an event with a valid move-type, actor is source and addresses match',
    },
    {
      document: stubDocument({
        externalEvents: [evaluateEvent],
      }),
      resultComment: ruleDataProcessor['ResultComments'].NO_SOURCE_ACTOR_EVENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return returnValue false when there is no actor event with actor type SOURCE',
    },
    {
      document: stubDocument({
        externalEvents: [
          evaluateEvent,
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: faker.string.uuid() },
              name: ACTOR,
            },
            [[ACTOR_TYPE, SOURCE]],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComments'].DO_NOT_MATCH,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return returnValue false when addresses do not match',
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
