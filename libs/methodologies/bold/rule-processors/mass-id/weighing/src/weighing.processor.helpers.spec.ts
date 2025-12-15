import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { WeighingProcessor } from './weighing.processor';

describe('WeighingProcessor helpers', () => {
  it('should build a text extractor input when attachment and bucket are present', () => {
    const processor = new WeighingProcessor();

    const weighingEvent = {
      attachments: [
        {
          attachmentId: 'attachment-1',
          contentLength: 0,
          isPublic: false,
          label: 'Scale Ticket',
        },
      ],
    } as unknown as DocumentEvent;

    const ruleInput = stubRuleInput({
      documentId: 'doc-1',
      documentKeyPrefix: 'prefix',
    });

    process.env['SCALE_TICKET_S3_BUCKET'] = 'bucket-name';

    const input = processor['buildScaleTicketTextExtractorInput'](
      weighingEvent,
      ruleInput,
    );

    expect(input).toEqual({
      s3Bucket: 'bucket-name',
      s3Key: 'prefix/attachments/attachment-1',
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
          label: 'Scale Ticket',
        },
      ],
    } as unknown as DocumentEvent;

    const ruleInput = stubRuleInput({
      documentId: 'doc-1',
      documentKeyPrefix: 'prefix',
    });

    delete process.env['SCALE_TICKET_S3_BUCKET'];

    const input = processor['buildScaleTicketTextExtractorInput'](
      weighingEvent,
      ruleInput,
    );

    expect(input).toBeUndefined();
  });
});
