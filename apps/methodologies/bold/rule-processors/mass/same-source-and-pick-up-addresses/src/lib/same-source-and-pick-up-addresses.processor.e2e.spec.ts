import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventActorType,
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

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments(
  {
    handler,
    ruleName: 'SameSourceAndPickUpAddressesProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('SameSourceAndPickUpAddressesProcessor', () => {
      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const { ACTOR, OPEN } = DocumentEventName;
      const { ACTOR_TYPE, MOVE_TYPE } = DocumentEventAttributeName;
      const { PICK_UP } = DocumentEventMoveType;
      const { SOURCE } = DocumentEventActorType;

      const addressId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: addressId },
              name: OPEN,
            },
            [[MOVE_TYPE, PICK_UP]],
          ),
          stubDocumentEventWithMetadataAttributes(
            {
              address: { id: faker.string.uuid() },
              name: ACTOR,
            },
            [[ACTOR_TYPE, SOURCE]],
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

      it('should REJECTE when the address ids do not match', async () => {
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
