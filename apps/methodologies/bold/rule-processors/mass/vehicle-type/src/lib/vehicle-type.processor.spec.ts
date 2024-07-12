import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
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
import { stubEventWithVehicleType } from './vehicle-type.stubs';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('VehicleTypeProcessor', () => {
  const ruleDataProcessor = new VehicleTypeProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      externalEvents: [],
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED if there is no move-type attribute',
    },
    {
      externalEvents: [
        stubEventWithVehicleType(stubEnumValue(DocumentEventVehicleType)),
      ],
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED if vehicle-type attribute value matches a value from DocumentEventVehicleType enum',
    },
    {
      externalEvents: [stubEventWithVehicleType('')],
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED if move-type is Pick-up or Shipment-Request but the vehicle-type attribute value is an empty string',
    },
    {
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({}, [
          [DocumentEventAttributeName.MOVE_TYPE, DocumentEventMoveType.PICK_UP],
        ]),
      ],
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED if move-type is Pick-up or Shipment-Request but the vehicle-type attribute does not exist',
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
