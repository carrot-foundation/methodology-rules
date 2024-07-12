import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventVehicleType,
} from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { VehicleTypeProcessor } from './vehicle-type.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('VehicleTypeProcessor', () => {
  const ruleDataProcessor = new VehicleTypeProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { MOVE_TYPE, VEHICLE_TYPE } = DocumentEventAttributeName;
  const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

  const generateCommonEvents = (moveType: string, vehicleType?: string) => [
    stubDocumentEventWithMetadataAttributes({}, [
      [MOVE_TYPE, moveType],
      [VEHICLE_TYPE, vehicleType || ''],
    ]),
  ];

  it.each([
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED if there is no move-type attribute',
    },
    {
      document: stubDocument({
        externalEvents: generateCommonEvents(
          random<typeof PICK_UP | typeof SHIPMENT_REQUEST>(),
          stubEnumValue(DocumentEventVehicleType),
        ),
      }),
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED if vehicle-type attribute value matches a value from DocumentEventVehicleType enum',
    },
    {
      document: stubDocument({
        externalEvents:
          generateCommonEvents(
            random<typeof PICK_UP | typeof SHIPMENT_REQUEST>(),
          ),
      }),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the resultStatus REJECTED if move-type is Pick-up or Shipment-Request but the vehicle-type attribute value does not exist or is an empty string',
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
