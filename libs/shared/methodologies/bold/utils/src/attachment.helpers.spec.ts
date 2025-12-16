import { getAttachmentS3Key } from './attachment.helpers';

describe('Attachment Helpers', () => {
  describe('getAttachmentS3Key', () => {
    it('should construct the S3 key path using the canonical pattern', () => {
      const documentId = 'doc-123';
      const attachmentId = 'att-456';

      const result = getAttachmentS3Key(documentId, attachmentId);

      expect(result).toBe('attachments/document/doc-123/att-456');
    });

    it('should handle UUIDs as document and attachment IDs', () => {
      const documentId = 'e710790f-5909-4a54-ab89-6a59819472ee';
      const attachmentId = 'f5746bcf-8510-46ca-96d8-d4081bda9410';

      const result = getAttachmentS3Key(documentId, attachmentId);

      expect(result).toBe(
        'attachments/document/e710790f-5909-4a54-ab89-6a59819472ee/f5746bcf-8510-46ca-96d8-d4081bda9410',
      );
    });

    it('should preserve special characters in IDs', () => {
      const documentId = 'doc_123-test';
      const attachmentId = 'att-456_test';

      const result = getAttachmentS3Key(documentId, attachmentId);

      expect(result).toBe('attachments/document/doc_123-test/att-456_test');
    });
  });
});
