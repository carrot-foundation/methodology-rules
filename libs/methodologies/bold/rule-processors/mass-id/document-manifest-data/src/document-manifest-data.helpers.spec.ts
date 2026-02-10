import {
  type DocumentManifestEventSubject,
  getAttachmentInfos,
  getExtractorConfig,
} from './document-manifest-data.helpers';

describe('document-manifest-data.helpers', () => {
  describe('getAttachmentInfos', () => {
    const originalEnvironment = process.env;

    beforeEach(() => {
      process.env = { ...originalEnvironment };
    });

    afterEach(() => {
      process.env = originalEnvironment;
    });

    it('should return empty array when DOCUMENT_ATTACHMENT_BUCKET_NAME is not set', () => {
      delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

      const events: DocumentManifestEventSubject[] = [
        {
          attachment: { attachmentId: 'attachment-123', label: 'test' },
        } as DocumentManifestEventSubject,
      ];

      const result = getAttachmentInfos({
        documentId: 'doc-123',
        events,
      });

      expect(result).toEqual([]);
    });

    it('should return attachment infos when bucket name is set', () => {
      process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = 'test-bucket';

      const events: DocumentManifestEventSubject[] = [
        {
          attachment: { attachmentId: 'attachment-123', label: 'test' },
        } as DocumentManifestEventSubject,
      ];

      const result = getAttachmentInfos({
        documentId: 'doc-123',
        events,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        attachmentId: 'attachment-123',
        s3Bucket: 'test-bucket',
        s3Key: 'attachments/document/doc-123/attachment-123',
      });
    });

    it('should filter out events without attachmentId', () => {
      process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = 'test-bucket';

      const events: DocumentManifestEventSubject[] = [
        {
          attachment: { attachmentId: 'attachment-123', label: 'test' },
        } as DocumentManifestEventSubject,
        {
          attachment: undefined,
        } as DocumentManifestEventSubject,
        {
          attachment: { attachmentId: '', label: 'test' },
        } as DocumentManifestEventSubject,
      ];

      const result = getAttachmentInfos({
        documentId: 'doc-123',
        events,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.attachmentId).toBe('attachment-123');
    });
  });

  describe('getExtractorConfig', () => {
    it('should return undefined when eventDocumentType is nil', () => {
      expect(getExtractorConfig(undefined)).toBeUndefined();
      expect(getExtractorConfig(null as unknown as undefined)).toBeUndefined();
    });

    it('should return config for CDF document type', () => {
      const result = getExtractorConfig('CDF');

      expect(result).toEqual({
        documentType: 'recyclingManifest',
        layouts: ['cdf-brazil'],
      });
    });

    it('should return config for MTR document type', () => {
      const result = getExtractorConfig('MTR');

      expect(result).toEqual({
        documentType: 'transportManifest',
        layouts: ['mtr-brazil', 'mtr-cetesb-sp'],
      });
    });

    it('should return undefined for unknown document type', () => {
      expect(getExtractorConfig('UNKNOWN')).toBeUndefined();
    });
  });
});
