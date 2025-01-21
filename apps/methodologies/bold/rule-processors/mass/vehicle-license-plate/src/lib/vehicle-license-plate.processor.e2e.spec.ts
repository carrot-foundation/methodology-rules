import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments(
  {
    handler,
    ruleName: 'VehicleLicensePlateProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('VehicleLicensePlateProcessor E2E', () => {
      const { PICK_UP } = DocumentEventMoveType;
      const { OTHERS } = DocumentEventVehicleType;
      const { MOVE_TYPE, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
        DocumentEventAttributeName;
      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: random<DocumentEventName>() },
            [
              [MOVE_TYPE, PICK_UP],
              [VEHICLE_TYPE, OTHERS],
              [VEHICLE_LICENSE_PLATE, ''],
            ],
          ),
        ],
      });

      beforeAll(() => {
        prepareEnvironmentTestE2E([
          {
            document,
            documentKey: toDocumentKey({
              documentId: parentDocumentId,
              documentKeyPrefix,
            }),
          },
        ]);
      });

      it('should return REJECTED when the event has metadata attribute vehicle-license-plate with a value equal to empty string', async () => {
        const response = await handler(
          stubRuleInput({
            documentKeyPrefix,
            parentDocumentId,
          }),
          stubContext(),
          () => stubRuleResponse(),
        );

        expect(response).toMatchObject({
          resultStatus: RuleOutputStatus.REJECTED,
        });
      });
    });
  },
);
