import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { DriverInternalIdProcessor } from './driver-internal-id.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DriverInternalIdProcessor', () => {
  const ruleDataProcessor = new DriverInternalIdProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { DRIVER_INTERNAL_ID, MOVE_TYPE, VEHICLE_TYPE } =
    DocumentEventAttributeName;
  const { TRUCK } = DocumentEventVehicleType;
  const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName>() },
            [
              [MOVE_TYPE, random<typeof PICK_UP | typeof SHIPMENT_REQUEST>()],
              [VEHICLE_TYPE, TRUCK],
              [DRIVER_INTERNAL_ID, faker.string.uuid()],
            ],
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when move-type is Pickup or Shipment-request, vehicle-type is not Sludge Pipes and driver-internal-id is not empty',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName>() },
            [
              [MOVE_TYPE, random<typeof PICK_UP | typeof SHIPMENT_REQUEST>()],
              [VEHICLE_TYPE, TRUCK],
              [DRIVER_INTERNAL_ID, ''],
            ],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when move-type is Pickup or Shipment-request, vehicle-type is not Sludge Pipes and driver-internal-id is empty',
    },
    {
      document: stubDocument({
        externalEvents: [],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED when there is no external events',
    },
  ])('$scenario', async ({ document, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(document);

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
