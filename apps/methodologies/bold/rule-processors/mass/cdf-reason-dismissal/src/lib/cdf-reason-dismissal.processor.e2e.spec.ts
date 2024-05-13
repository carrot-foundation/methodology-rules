import {
  stubDocument,
  stubDocumentEvent,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/methodologies/bold/types';
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
    ruleName: 'CdfReasonDismissalProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('CdfReasonDismissalProcessor E2E', () => {
      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: true,
                  name: 'has-cdf',
                  value: false,
                },
              ],
            },
            name: DocumentEventName.END,
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

      it('should return the resultStatus REJECTED if the END event does not have the MTR even the has-reason-dismissal-cdf', async () => {
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
