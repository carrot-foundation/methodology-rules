import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  stubDocument,
  stubDocumentEvent,
  testRuleProcessorWithMassDocuments,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
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
    ruleName: 'HasCdfProcessor',
    skipRejectTest: true,
  },
  () => {
    describe('HasCdfProcessor E2E', () => {
      const documentKeyPrefix = faker.string.uuid();
      const parentDocumentId = faker.string.uuid();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: faker.datatype.boolean(),
                  name: DocumentEventAttributeName.HAS_CDF,
                  value: true,
                },
                {
                  isPublic: faker.datatype.boolean(),
                  name: DocumentEventAttributeName.REPORT_TYPE,
                  value: ReportType.MTR,
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

      it('should return REJECTED when end event does not have metadata attributes has-mtr:false or report-type:CDF', async () => {
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
