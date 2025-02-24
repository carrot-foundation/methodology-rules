import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
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
    ruleName: 'VehicleDescriptionProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('VehicleDescriptionProcessor E2E', () => {
      const { PICK_UP } = DocumentEventMoveType;
      const { OTHERS } = DocumentEventVehicleType;
      const { MOVE_TYPE, VEHICLE_DESCRIPTION, VEHICLE_TYPE } =
        DocumentEventAttributeName;

      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              name: random<DocumentEventName.MOVE | DocumentEventName.OPEN>(),
            },
            [
              [MOVE_TYPE, PICK_UP],
              [VEHICLE_TYPE, OTHERS],
              [VEHICLE_DESCRIPTION, ''],
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

      it('should return REJECTED when any event has metadata attribute vehicle-description with a value equal to empty string', async () => {
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
