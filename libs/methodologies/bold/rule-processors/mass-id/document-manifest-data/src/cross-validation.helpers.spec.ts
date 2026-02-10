import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';

import type { DocumentManifestEventSubject } from './document-manifest-data.helpers';

import { validateBasicExtractedData } from './cross-validation.helpers';

describe('cross-validation.helpers', () => {
  describe('validateBasicExtractedData', () => {
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

      const result = validateBasicExtractedData(extractionResult, eventSubject);

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

      const result = validateBasicExtractedData(extractionResult, eventSubject);

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

      const result = validateBasicExtractedData(extractionResult, eventSubject);

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

      const result = validateBasicExtractedData(extractionResult, eventSubject);

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

      const result = validateBasicExtractedData(extractionResult, eventSubject);

      expect(result.failMessages).toHaveLength(0);
    });
  });
});
