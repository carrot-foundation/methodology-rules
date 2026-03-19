import {
  type DocumentEvent,
  DocumentEventAttachmentLabel,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { WeighingProcessor } from './weighing.processor';

const mockGetDocumentAttachmentBucketName = jest.fn(
  () => undefined as string | undefined,
);

jest.mock('@carrot-fndn/shared/env', () => ({
  getDocumentAttachmentBucketName: () => mockGetDocumentAttachmentBucketName(),
  getDocumentBucketName: () => 'test-bucket',
}));

describe('WeighingProcessor helpers', () => {
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

    mockGetDocumentAttachmentBucketName.mockReturnValue('bucket-name');

    const input = processor['buildScaleTicketTextExtractorInput'](
      weighingEvent,
      'doc-1',
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

    mockGetDocumentAttachmentBucketName.mockReturnValue(undefined);

    const input = processor['buildScaleTicketTextExtractorInput'](
      weighingEvent,
      'doc-1',
    );

    expect(input).toBeUndefined();
  });
});
