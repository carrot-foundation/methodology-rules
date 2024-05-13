import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { DriverInternalIdProcessor } from './driver-internal-id.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('DriverInternalIdProcessor', () => {
  const ruleDataProcessor = new DriverInternalIdProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { MOVE, OPEN } = DocumentEventName;

  const { DRIVER_INTERNAL_ID, MOVE_TYPE, VEHICLE_TYPE } =
    DocumentEventAttributeName;

  const { TRUCK } = DocumentEventVehicleType;

  const { PICK_UP } = DocumentEventMoveType;

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [MOVE_TYPE, PICK_UP],
            [VEHICLE_TYPE, TRUCK],
            [DRIVER_INTERNAL_ID, faker.string.uuid()],
          ]),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return returnValue true when move-type is Pickup, vehicle-type is not Sludge Pipes and driver-internal-id is not empty when event is OPEN',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: MOVE }, [
            [MOVE_TYPE, PICK_UP],
            [VEHICLE_TYPE, TRUCK],
            [DRIVER_INTERNAL_ID, faker.string.uuid()],
          ]),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return returnValue true when move-type is Pickup, vehicle-type is not Sludge Pipes and driver-internal-id is not empty when event is MOVE',
    },
  ])('$scenario', async ({ document, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(document);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus,
    };

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
