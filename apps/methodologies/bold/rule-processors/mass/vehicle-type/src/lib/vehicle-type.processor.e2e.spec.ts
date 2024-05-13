import {
  stubDocument,
  stubDocumentEvent,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
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
    ruleName: 'VehicleTypeProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('VehicleTypeProcessor E2E', () => {
      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: true,
                  name: DocumentEventAttributeName.MOVE_TYPE,
                  value: DocumentEventMoveType.PICK_UP,
                },
                {
                  isPublic: true,
                  name: DocumentEventAttributeName.VEHICLE_TYPE,
                  value: faker.string.sample(),
                },
              ],
            },
            name: random<DocumentEventName.MOVE | DocumentEventName.OPEN>(),
          }),
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

      it('should return the resultStatus REJECTED if the OPEN or MOVE events does not satisfy the vehicle-type', async () => {
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
