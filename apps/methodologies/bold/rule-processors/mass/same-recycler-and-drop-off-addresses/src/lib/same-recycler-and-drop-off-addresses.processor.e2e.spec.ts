import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
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

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments(
  {
    handler,
    ruleName: 'SameRecyclerAndDropOffAddressesProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('SameRecyclerAndDropOffAddressesProcessor E2E', () => {
      const { ACTOR_TYPE, MOVE_TYPE } = DocumentEventAttributeName;
      const { DROP_OFF } = DocumentEventMoveType;
      const { RECYCLER } = DocumentEventActorType;

      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: DocumentEventName.MOVE },
            [[MOVE_TYPE, DROP_OFF]],
          ),
          stubDocumentEventWithMetadataAttributes(
            { name: DocumentEventName.ACTOR },
            [[ACTOR_TYPE, RECYCLER]],
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

      it('should return REJECTED if moveTypeEvent and recyclerActorEvent have different address IDs', async () => {
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
