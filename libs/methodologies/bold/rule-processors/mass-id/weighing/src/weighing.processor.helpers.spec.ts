import {
  type DocumentEvent,
  DocumentEventAttachmentLabel,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { WeighingProcessor } from './weighing.processor';

describe('WeighingProcessor helpers', () => {
  const originalScaleTicketBucket =
    process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

  afterEach(() => {
    process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = originalScaleTicketBucket;
  });

  it('should build a text extractor input when attachment and bucket are present', () => {
    const processor = new WeighingProcessor();

    const weighingEvent = {
      attachments: [
        {
          attachmentId: 'attachment-1',
          contentLength: 0,
          isPublic: false,
          label: DocumentEventAttachmentLabel.WEIGHING_TICKET,
        },
      ],
    } as unknown as DocumentEvent;

    const ruleInput = stubRuleInput({
      documentId: 'doc-1',
      documentKeyPrefix: 'prefix',
    });

    process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = 'bucket-name';

    const input = processor['buildScaleTicketTextExtractorInput'](
      weighingEvent,
      ruleInput,
    );

    expect(input).toEqual({
      s3Bucket: 'bucket-name',
      s3Key: 'attachments/document/doc-1/attachment-1',
    });
  });

  it('should return undefined when bucket is not configured', () => {
    const processor = new WeighingProcessor();

    const weighingEvent = {
      attachments: [
        {
          attachmentId: 'attachment-1',
          contentLength: 0,
          isPublic: false,
          label: DocumentEventAttachmentLabel.WEIGHING_TICKET,
        },
      ],
    } as unknown as DocumentEvent;

    const ruleInput = stubRuleInput({
      documentId: 'doc-1',
      documentKeyPrefix: 'prefix',
    });

    delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

    const input = processor['buildScaleTicketTextExtractorInput'](
      weighingEvent,
      ruleInput,
    );

    expect(input).toBeUndefined();
  });
});
