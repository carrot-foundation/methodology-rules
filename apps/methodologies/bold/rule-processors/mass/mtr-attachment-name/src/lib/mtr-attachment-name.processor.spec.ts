import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventAttachment,
  stubDocumentEventAttribute,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
} from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { MtrAttachmentNameProcessor } from './mtr-attachment-name.processor';
import { MTR_ATTACHMENT_NAME_RESULT_COMMENT } from './mtr-attachment-name.processor.constants';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('MtrAttachmentNameProcessor', () => {
  const ruleDataProcessor = new MtrAttachmentNameProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            attachments: [
              stubDocumentEventAttachment({ label: ReportType.MTR }),
            ],
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
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when has-mtr is true, and there is attachment with label "MTR"',
    },
    {
      document: stubDocument({
        externalEvents: [],
      }),
      resultComment: MTR_ATTACHMENT_NAME_RESULT_COMMENT.rule_not_applicable,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED and resultComment when not found "OPEN" envent with "has-mtr" equal true',
    },
    {
      document: stubDocument({
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
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the resultStatus REJECTED if has-mtr is equal true, "OPEN" event but there is no attachment',
    },
    {
      document: stubDocument(),
      resultComment: MTR_ATTACHMENT_NAME_RESULT_COMMENT.rule_not_applicable,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED if there is no externalEvents',
    },
  ])('$scenario', async ({ document, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(document);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus,
    };
    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
