import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments(
  {
    handler,
    ruleName: 'WasteOriginIdentifiedProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('WasteOriginIdentifiedProcessor E2E', () => {
      const { ACTOR } = MethodologyDocumentEventName;
      const { SOURCE } = DocumentEventActorType;
      const { ACTOR_TYPE, WASTE_ORIGIN_IDENTIFIED } =
        DocumentEventAttributeName;

      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
            [ACTOR_TYPE, SOURCE],
            [WASTE_ORIGIN_IDENTIFIED, faker.string.sample()],
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

      it('should return REJECTED if ACTOR event does not have waste-origin-identified with value true or false', async () => {
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
