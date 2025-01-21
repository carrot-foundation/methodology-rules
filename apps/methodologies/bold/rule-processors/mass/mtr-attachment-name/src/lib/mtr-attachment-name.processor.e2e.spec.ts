import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventAttribute,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventAttributeName,
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
    ruleName: 'MtrAttachmentNameProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('MtrAttachmentNameProcessor E2E', () => {
      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            attachments: [],
            metadata: {
              attributes: [
                stubDocumentEventAttribute({
                  name: DocumentEventAttributeName.HAS_MTR,
                  value: true,
                }),
              ],
            },
            name: DocumentEventName.OPEN,
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

      it('should return REJECTED when "OPEN" event have metadata attribute "has-mtr", but no attachment with "MTR" label', async () => {
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
