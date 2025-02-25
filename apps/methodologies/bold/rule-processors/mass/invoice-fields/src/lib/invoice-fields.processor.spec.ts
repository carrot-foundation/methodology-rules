import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { InvoiceFieldsProcessor } from './invoice-fields.processor';
import { stubEventWithAllInvoiceFields } from './invoice-fields.processor.stub';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('InvoiceFieldsProcessor', () => {
  const ruleDataProcessor = new InvoiceFieldsProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocument({
        externalEvents: [stubEventWithAllInvoiceFields()],
      }),
      resultComment:
        InvoiceFieldsProcessor.resultComment.noMissingInvoiceFields,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'all invoice fields are prensent in MOVE event',
    },
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultComment:
        InvoiceFieldsProcessor.resultComment.noMissingInvoiceFields,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'has no external events',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: false,
                  name: DocumentEventAttributeName.INVOICE_KEY,
                  value: faker.string.alphanumeric(),
                },
                {
                  isPublic: false,
                  name: DocumentEventAttributeName.INVOICE_COUNTRY,
                  value: faker.location.country(),
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment:
        InvoiceFieldsProcessor.resultComment.noMissingInvoiceFields,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'has no invoice number is prensent in MOVE event',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: false,
                  name: DocumentEventAttributeName.INVOICE_NUMBER,
                  value: faker.string.alphanumeric(),
                },
              ],
            },
            name: DocumentEventName.OPEN,
          }),
        ],
      }),
      resultComment:
        InvoiceFieldsProcessor.resultComment.noMissingInvoiceFields,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'invoice number is present but event name is not MOVE',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: false,
                  name: DocumentEventAttributeName.INVOICE_NUMBER,
                  value: faker.string.alphanumeric(),
                },
                {
                  isPublic: false,
                  name: DocumentEventAttributeName.INVOICE_KEY,
                  value: faker.string.alphanumeric(),
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment: InvoiceFieldsProcessor.resultComment.hasNoInvoiceFields,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'invoice number is present but other fields are missing in MOVE event',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: false,
                  name: DocumentEventAttributeName.INVOICE_NUMBER,
                  value: '',
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment: InvoiceFieldsProcessor.resultComment.hasNoInvoiceFields,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'invoice number is empty in MOVE event',
    },
  ])(
    `should return $resultStatus when $scenario`,
    async ({ document, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );

  it('should return REJECTED when the document is undefined', async () => {
    const ruleInput = random<RuleInput>();

    delete ruleInput.parentDocumentId;

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
