import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubAddress,
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { MaximumDistanceProcessor } from './maximum-distance.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

const { DROP_OFF, PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

describe('MaximumDistanceProcessor', () => {
  const ruleDataProcessor = new MaximumDistanceProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const pickUpOrShipmentRequestEvent = stubDocumentEvent({
    metadata: {
      attributes: [
        {
          isPublic: faker.datatype.boolean(),
          name: DocumentEventAttributeName.MOVE_TYPE,
          value: random<typeof PICK_UP | typeof SHIPMENT_REQUEST>(),
        },
      ],
    },
    name: random<DocumentEventName>(),
  });
  const dropOffEvent = stubDocumentEvent({
    metadata: {
      attributes: [
        {
          isPublic: faker.datatype.boolean(),
          name: DocumentEventAttributeName.MOVE_TYPE,
          value: DROP_OFF,
        },
      ],
    },
    name: random<DocumentEventName>(),
  });

  it.each([
    {
      externalEvents: undefined,
      resultComment: ruleDataProcessor['ResultComment'].DROP_OFF_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the document does not have the PICK_UP or SHIPMENT_REQUEST event',
    },
    {
      externalEvents: [],
      resultComment: ruleDataProcessor['ResultComment'].DROP_OFF_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the document does not have external events',
    },
    {
      externalEvents: [pickUpOrShipmentRequestEvent],
      resultComment: ruleDataProcessor['ResultComment'].DROP_OFF_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the document does not have the DROP_OFF event',
    },
    {
      externalEvents: [
        {
          ...pickUpOrShipmentRequestEvent,
          address: stubAddress({
            latitude: 0,
            longitude: 0,
          }),
        },
        {
          ...dropOffEvent,
          address: stubAddress({
            latitude: 100,
            longitude: 100,
          }),
        },
      ],
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the distance between the events is too far',
    },
    {
      externalEvents: [
        {
          ...pickUpOrShipmentRequestEvent,
          address: stubAddress({
            latitude: 0,
            longitude: 0,
          }),
        },
        {
          ...dropOffEvent,
          address: stubAddress({
            latitude: 0,
            longitude: 0,
          }),
        },
      ],
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when the distance between the events is less than 200 meters',
    },
  ])('$scenario', async ({ externalEvents, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(
      stubDocument({ externalEvents }),
    );

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus,
    };
    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
