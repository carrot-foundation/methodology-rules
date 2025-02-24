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

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments(
  {
    handler,
    ruleName: 'DriverInternalIdProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('E2E - DriverInternalIdProcessor', () => {
      const { OPEN } = DocumentEventName;
      const { MOVE_TYPE, VEHICLE_TYPE } = DocumentEventAttributeName;
      const { TRUCK } = DocumentEventVehicleType;
      const { PICK_UP } = DocumentEventMoveType;

      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [MOVE_TYPE, PICK_UP],
            [VEHICLE_TYPE, TRUCK],
          ]),
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

      it('should return REJECTED when driver-internal-id is empty', async () => {
        const response = await handler(
          stubRuleInput({
            documentKeyPrefix,
            parentDocumentId,
          }),
          stubContext(),
          () => stubRuleResponse(),
        );

        expect(response).toMatchObject({
          resultComment:
            'Driver internal id is missing for a non-sludge pipes move',
          resultStatus: RuleOutputStatus.REJECTED,
        });
      });
    });
  },
);
