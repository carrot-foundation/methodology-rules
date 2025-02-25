import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventAttachment,
  stubDocumentEventAttribute,
  stubDocumentEventWithReportType,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { MtrAttachmentVerificationProcessor } from './mtr-attachment-verification.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('MtrAttachmentVerificationProcessor', () => {
  const ruleDataProcessor = new MtrAttachmentVerificationProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it('should return returnValue equal APPROVED when has-mtr is true, report-type is MTR, and there are attachments', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({
      externalEvents: [
        ...stubArray(() => random<DocumentEvent>(), 3),
        stubDocumentEventWithReportType(ReportType.MTR, {
          attachments: [stubDocumentEventAttachment()],
          metadata: {
            attributes: [
              stubDocumentEventAttribute({
                name: DocumentEventAttributeName.HAS_MTR,
                value: true,
              }),
            ],
          },
        }),
      ],
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };
    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return the resultStatus APPROVED if has-mtr is equal false', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({
      externalEvents: [
        ...stubArray(() => random<DocumentEvent>(), 3),
        stubDocumentEventWithReportType(ReportType.MTR, {
          metadata: {
            attributes: [
              stubDocumentEventAttribute({
                name: DocumentEventAttributeName.HAS_MTR,
                value: false,
              }),
            ],
          },
        }),
      ],
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return the resultStatus REJECTED if has-mtr is equal true, report-type is MTR but there is no attachment', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({
      externalEvents: [
        ...stubArray(() => random<DocumentEvent>(), 3),
        stubDocumentEventWithReportType(ReportType.MTR, {
          attachments: [],
          metadata: {
            attributes: [
              stubDocumentEventAttribute({
                name: DocumentEventAttributeName.HAS_MTR,
                value: true,
              }),
            ],
          },
        }),
      ],
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return the resultStatus APPROVED if the report-type is not MTR', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({
      externalEvents: [
        ...stubArray(() => random<DocumentEvent>(), 3),
        stubDocumentEventWithReportType(ReportType.CDF, {
          attachments: [stubDocumentEventAttachment()],
          metadata: {
            attributes: [
              stubDocumentEventAttribute({
                name: DocumentEventAttributeName.HAS_MTR,
                value: true,
              }),
            ],
          },
        }),
      ],
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return the resultStatus REJECTED if there is no document', async () => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return the resultStatus APPROVED if there is no externalEvents', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument();

    documentLoaderService.mockResolvedValueOnce({
      ...document,
      externalEvents: undefined,
    });

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
