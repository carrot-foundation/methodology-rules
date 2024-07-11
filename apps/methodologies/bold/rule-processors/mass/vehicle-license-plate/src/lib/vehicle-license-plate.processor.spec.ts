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
  DocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { VehicleLicensePlateProcessor } from './vehicle-license-plate.processor';

jest.mock('@carrot-fndn/shared/document/loader');

describe('VehicleLicensePlateProcessor', () => {
  const { OTHERS } = DocumentEventVehicleType;
  const { MOVE_TYPE, VEHICLE_TYPE } = DocumentEventAttributeName;
  const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;
  const ruleDataProcessor = new VehicleLicensePlateProcessor();
  const documentLoaderService = jest.mocked(DocumentLoaderService.prototype);

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName.MOVE | DocumentEventName.OPEN>() },
            [[VEHICLE_TYPE, OTHERS]],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'does not have an event with metadata attribute move-type with a value equal to Pick-up or Shipment-request',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName.MOVE | DocumentEventName.OPEN>() },
            [[MOVE_TYPE, random<typeof PICK_UP | typeof SHIPMENT_REQUEST>()]],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'does not have an event with metadata attribute vehicle-type',
    },
  ])(
    `should return "$resultStatus" when the document $scenario`,
    async ({ document, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const documentEntity = {
        ...stubDocumentEntity(),
        document,
      };

      documentLoaderService.load.mockResolvedValueOnce(documentEntity);

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
