import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  DocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { VehicleDescriptionProcessor } from './vehicle-description.processor';

jest.mock('@carrot-fndn/shared/document/loader');

describe('VehicleDescriptionProcessor', () => {
  const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;
  const { OTHERS } = DocumentEventVehicleType;
  const { MOVE_TYPE, VEHICLE_DESCRIPTION, VEHICLE_TYPE } =
    DocumentEventAttributeName;

  const ruleDataProcessor = new VehicleDescriptionProcessor();
  const documentLoaderService = jest.mocked(DocumentLoaderService.prototype);

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName>() },
            [
              [MOVE_TYPE, random<typeof PICK_UP | typeof SHIPMENT_REQUEST>()],
              [VEHICLE_TYPE, OTHERS],
              [VEHICLE_DESCRIPTION, faker.string.sample()],
            ],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when has the vehicle-description metadata attribute and the value is a non-empty string',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName>() },
            [[VEHICLE_TYPE, OTHERS]],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when only has metadata attribute vehicle-type with value equal to Others',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName>() },
            [[MOVE_TYPE, random<typeof PICK_UP | typeof SHIPMENT_REQUEST>()]],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when only has metadata attribute move-type with value equal to Pick-up or Shipment-request',
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
