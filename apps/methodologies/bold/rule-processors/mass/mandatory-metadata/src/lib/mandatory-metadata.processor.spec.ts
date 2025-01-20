import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { MandatoryMetadataProcessor } from './mandatory-metadata.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('MandatoryMetadataProcessor', () => {
  const ruleDataProcessor = new MandatoryMetadataProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      attributeValue: DocumentEventMoveType.PICK_UP,
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'a OPEN event with PICK_UP attribute',
    },
    {
      attributeValue: DocumentEventMoveType.SHIPMENT_REQUEST,
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'a OPEN event with SHIPMENT_REQUEST attribute',
    },
    {
      attributeValue: DocumentEventMoveType.WEIGHING,
      resultComment: MandatoryMetadataProcessor.resultComment.eventNotFound,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'The OPEN event with metadata move-type = Pick-up or Shipment-request was not found',
    },
  ])(
    `should return $resultStatus when the document has $scenario`,
    async ({ attributeValue, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: true,
                  name: DocumentEventAttributeName.MOVE_TYPE,
                  value: attributeValue,
                },
              ],
            },
            name: DocumentEventName.OPEN,
          }),
        ],
      });

      documentLoaderService.mockResolvedValueOnce(documentStub);

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

  it('should return REJECTED when the document has no OPEN event with MOVE_TYPE', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const documentStub = stubDocument({
      externalEvents: [
        stubDocumentEvent({
          metadata: {
            attributes: [
              {
                isPublic: true,
                name: DocumentEventAttributeName.RULE_NAME,
                value: DocumentEventMoveType.PICK_UP,
              },
            ],
          },
          name: DocumentEventName.OPEN,
        }),
      ],
    });

    documentLoaderService.mockResolvedValueOnce(documentStub);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: MandatoryMetadataProcessor.resultComment.eventNotFound,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

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
