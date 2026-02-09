import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';

import {
  type DocumentManifestEventSubject,
  getAttachmentInfos,
  getExtractorConfig,
  validateExtractedDataAgainstEvent,
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
        layouts: ['mtr-brazil'],
      });
    });

    it('should return undefined for unknown document type', () => {
      expect(getExtractorConfig('UNKNOWN')).toBeUndefined();
    });
  });

  describe('validateExtractedDataAgainstEvent', () => {
    it('should return reviewRequired when extraction confidence is low', () => {
      const extractionResult = {
        data: {
          extractionConfidence: 'low',
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: '12345',
        issueDateAttribute: { name: 'issueDate', value: '2024-01-01' },
      } as DocumentManifestEventSubject;

      const result = validateExtractedDataAgainstEvent(
        extractionResult,
        eventSubject,
      );

      expect(result.reviewRequired).toBe(true);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should return fail message when document numbers do not match with high confidence', () => {
      const extractionResult = {
        data: {
          documentNumber: {
            confidence: 'high',
            parsed: '99999',
          },
          extractionConfidence: 'high',
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: '12345',
        issueDateAttribute: undefined,
      } as DocumentManifestEventSubject;

      const result = validateExtractedDataAgainstEvent(
        extractionResult,
        eventSubject,
      );

      expect(result.failMessages).toHaveLength(1);
      expect(result.failMessages[0]).toContain('12345');
      expect(result.failMessages[0]).toContain('99999');
    });

    it('should return fail message when issue dates do not match with high confidence', () => {
      const extractionResult = {
        data: {
          extractionConfidence: 'high',
          issueDate: {
            confidence: 'high',
            parsed: '2024-12-31',
          },
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: undefined,
        issueDateAttribute: { name: 'issueDate', value: '2024-01-01' },
      } as DocumentManifestEventSubject;

      const result = validateExtractedDataAgainstEvent(
        extractionResult,
        eventSubject,
      );

      expect(result.failMessages).toHaveLength(1);
      expect(result.failMessages[0]).toContain('2024-01-01');
      expect(result.failMessages[0]).toContain('2024-12-31');
    });

    it('should return no fail messages when data matches', () => {
      const extractionResult = {
        data: {
          documentNumber: {
            confidence: 'high',
            parsed: '12345',
          },
          extractionConfidence: 'high',
          issueDate: {
            confidence: 'high',
            parsed: '2024-01-01',
          },
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: '12345',
        issueDateAttribute: { name: 'issueDate', value: '2024-01-01' },
      } as DocumentManifestEventSubject;

      const result = validateExtractedDataAgainstEvent(
        extractionResult,
        eventSubject,
      );

      expect(result.failMessages).toHaveLength(0);
    });

    it('should not validate when confidence is not high', () => {
      const extractionResult = {
        data: {
          documentNumber: {
            confidence: 'medium',
            parsed: '99999',
          },
          extractionConfidence: 'high',
          issueDate: {
            confidence: 'low',
            parsed: '2024-12-31',
          },
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: '12345',
        issueDateAttribute: { name: 'issueDate', value: '2024-01-01' },
      } as DocumentManifestEventSubject;

      const result = validateExtractedDataAgainstEvent(
        extractionResult,
        eventSubject,
      );

      expect(result.failMessages).toHaveLength(0);
    });
  });
});
