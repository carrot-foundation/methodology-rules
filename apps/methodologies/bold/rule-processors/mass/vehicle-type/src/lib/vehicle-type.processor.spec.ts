import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
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
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { VehicleTypeProcessor } from './vehicle-type.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('VehicleTypeProcessor', () => {
  const ruleDataProcessor = new VehicleTypeProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { MOVE_TYPE } = DocumentEventAttributeName;
  const { PICK_UP } = DocumentEventMoveType;
  const { VEHICLE_TYPE } = DocumentEventAttributeName;
  const { OPEN } = DocumentEventName;

  it.each([
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED if there is no move-type attribute in OPEN or MOVE event',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [MOVE_TYPE, PICK_UP],
          ]),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the resultStatus REJECTED if move-type is present but the vechicle-type attribute value does not exist',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [MOVE_TYPE, PICK_UP],
            [VEHICLE_TYPE, ''],
          ]),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the resultStatus REJECTED if move-type is present but the vechicle-type attribute value is an empty string',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [MOVE_TYPE, PICK_UP],
            [VEHICLE_TYPE, stubEnumValue(DocumentEventVehicleType)],
          ]),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED if vechicle-type attribute value matches a value from DocumentEventVehicleType enum',
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
