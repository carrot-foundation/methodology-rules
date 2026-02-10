import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  type DocumentManifestEventSubject,
  getAttachmentInfos,
  getExtractorConfig,
  type MtrCrossValidationEventData,
  validateBasicExtractedData,
  validateMtrExtractedData,
} from './document-manifest-data.helpers';

const stubEntity = (name: string, taxId: string) => ({
  confidence: 'high' as const,
  parsed: { name, taxId },
  rawMatch: name,
});

const baseMtrData = {
  documentNumber: {
    confidence: 'high' as const,
    parsed: '12345',
    rawMatch: '12345',
  },
  documentType: 'transportManifest' as const,
  generator: stubEntity('Generator Co', '11.111.111/0001-11'),
  hauler: stubEntity('Hauler Co', '22.222.222/0001-22'),
  issueDate: {
    confidence: 'high' as const,
    parsed: '2024-01-01',
    rawMatch: '01/01/2024',
  },
  receiver: stubEntity('Receiver Co', '33.333.333/0001-33'),
};

const createExtractionResult = (
  data: Partial<MtrExtractedData>,
): ExtractionOutput<BaseExtractedData> =>
  ({
    data: {
      ...baseMtrData,
      extractionConfidence: 'high',
      ...data,
    },
    reviewReasons: [],
    reviewRequired: false,
  }) as unknown as ExtractionOutput<BaseExtractedData>;

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

  describe('validateMtrExtractedData', () => {
    const baseEventData: MtrCrossValidationEventData = {
      attachment: undefined,
      documentNumber: '12345',
      documentType: 'MTR',
      dropOffEvent: undefined,
      eventAddressId: 'addr-1',
      eventValue: 100,
      exemptionJustification: undefined,
      hasWrongLabelAttachment: false,
      haulerEvent: undefined,
      issueDateAttribute: undefined,
      pickUpEvent: undefined,
      recyclerCountryCode: 'BR',
      recyclerEvent: undefined,
      wasteGeneratorEvent: undefined,
    };

    it('should return reviewRequired when basic extraction confidence is low', () => {
      const extractionResult = createExtractionResult({
        extractionConfidence: 'low' as never,
      });

      const result = validateMtrExtractedData(extractionResult, baseEventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should fail when vehicle plate does not match with high confidence', () => {
      const extractionResult = createExtractionResult({
        vehiclePlate: {
          confidence: 'high',
          parsed: 'ABC1234',
          rawMatch: 'ABC1234',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          metadata: {
            attributes: [
              {
                isPublic: true,
                name: 'Vehicle License Plate',
                value: 'XYZ9876',
              },
            ],
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(1);
      expect(result.failMessages[0]).toContain('ABC1234');
      expect(result.failMessages[0]).toContain('XYZ9876');
    });

    it('should set reviewRequired when vehicle plate does not match with low confidence', () => {
      const extractionResult = createExtractionResult({
        vehiclePlate: {
          confidence: 'low',
          parsed: 'ABC1234',
          rawMatch: 'ABC1234',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          metadata: {
            attributes: [
              {
                isPublic: true,
                name: 'Vehicle License Plate',
                value: 'XYZ9876',
              },
            ],
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();
      expect(result.reviewReasons?.[0]).toContain('ABC1234');
    });

    it('should skip vehicle plate validation when pickUpEvent is missing', () => {
      const extractionResult = createExtractionResult({
        vehiclePlate: {
          confidence: 'high',
          parsed: 'ABC1234',
          rawMatch: 'ABC1234',
        },
      });

      const result = validateMtrExtractedData(extractionResult, baseEventData);

      expect(result.failMessages).toHaveLength(0);
    });

    it('should set reviewRequired when receiver name does not match', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          confidence: 'high',
          parsed: {
            name: 'COMPLETELY DIFFERENT COMPANY' as never,
            taxId: '12.345.678/0001-90' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: {
            name: 'Original Recycler Corp',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();
      expect(result.reviewReasons?.[0]).toContain('receiver name');
      expect(result.reviewReasons?.[0]).toContain('Similarity:');
      expect(result.failMessages).toHaveLength(0);
    });

    it('should set reviewRequired when generator name does not match', () => {
      const extractionResult = createExtractionResult({
        generator: {
          confidence: 'high',
          parsed: {
            name: 'COMPLETELY DIFFERENT GENERATOR' as never,
            taxId: '12.345.678/0001-90' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        wasteGeneratorEvent: {
          participant: {
            name: 'Original Generator Corp',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();
      expect(result.reviewReasons?.[0]).toContain('generator name');
      expect(result.reviewReasons?.[0]).toContain('Similarity:');
      expect(result.failMessages).toHaveLength(0);
    });

    it('should set reviewRequired when hauler name does not match', () => {
      const extractionResult = createExtractionResult({
        hauler: {
          confidence: 'high',
          parsed: {
            name: 'COMPLETELY DIFFERENT HAULER' as never,
            taxId: '12.345.678/0001-90' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        haulerEvent: {
          participant: {
            name: 'Original Hauler Corp',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();
      expect(result.reviewReasons?.[0]).toContain('hauler name');
      expect(result.reviewReasons?.[0]).toContain('Similarity:');
      expect(result.failMessages).toHaveLength(0);
    });

    it('should fail when receiver tax ID does not match with high confidence', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          confidence: 'high',
          parsed: {
            name: 'Receiver Co' as never,
            taxId: '99.999.999/0001-99' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: {
            name: 'Receiver Co',
            taxId: '11.111.111/0001-11',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(1);
      expect(result.failMessages[0]).toContain('receiver tax ID');
    });

    it('should not fail when tax IDs match after normalization', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          confidence: 'high',
          parsed: {
            name: 'Receiver Co' as never,
            taxId: '11111111000111' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: {
            name: 'Receiver Co',
            taxId: '11.111.111/0001-11',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
    });

    it('should skip tax ID validation when confidence is not high', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          confidence: 'low',
          parsed: {
            name: 'Receiver Co' as never,
            taxId: '99.999.999/0001-99' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: {
            name: 'Receiver Co',
            taxId: '11.111.111/0001-11',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
    });

    it('should skip entity name validation when confidence is not high', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          confidence: 'low',
          parsed: {
            name: 'Different Company' as never,
            taxId: '12.345.678/0001-90' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: {
            name: 'Original Recycler Corp',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(false);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should not flag when entity names match', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          confidence: 'high',
          parsed: {
            name: 'Recycler Corp' as never,
            taxId: '12.345.678/0001-90' as never,
          },
          rawMatch: 'some raw text',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: {
            name: 'Recycler Corp',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(false);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should fail when transport date differs by more than 3 days', () => {
      const extractionResult = createExtractionResult({
        transportDate: {
          confidence: 'high',
          parsed: '01/01/2024' as never,
          rawMatch: 'Data de Transporte: 01/01/2024',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          externalCreatedAt: '2024-01-10',
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages.length).toBeGreaterThan(0);
      expect(result.failMessages[0]).toContain('transport date');
    });

    it('should set reviewRequired when transport date differs by 1-3 days', () => {
      const extractionResult = createExtractionResult({
        transportDate: {
          confidence: 'high',
          parsed: '01/01/2024' as never,
          rawMatch: 'Data de Transporte: 01/01/2024',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          externalCreatedAt: '2024-01-03',
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should fail when receiving date differs by more than 3 days', () => {
      const extractionResult = createExtractionResult({
        receivingDate: {
          confidence: 'high',
          parsed: '01/01/2024' as never,
          rawMatch: 'Data de Recebimento: 01/01/2024',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        dropOffEvent: {
          externalCreatedAt: '2024-01-10',
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages.length).toBeGreaterThan(0);
      expect(result.failMessages[0]).toContain('receiving date');
    });

    it('should skip vehicle plate validation when pickUpEvent has no plate attribute', () => {
      const extractionResult = createExtractionResult({
        vehiclePlate: {
          confidence: 'high',
          parsed: 'ABC1234',
          rawMatch: 'ABC1234',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          metadata: {
            attributes: [
              {
                isPublic: true,
                name: 'Some Other Attribute',
                value: 'some-value',
              },
            ],
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
    });

    it('should not fail when vehicle plates match after normalization', () => {
      const extractionResult = createExtractionResult({
        vehiclePlate: {
          confidence: 'high',
          parsed: 'ABC-1D34',
          rawMatch: 'ABC-1D34',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          metadata: {
            attributes: [
              {
                isPublic: true,
                name: 'Vehicle License Plate',
                value: 'ABC1D34',
              },
            ],
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });

    it('should skip date validation when confidence is not high', () => {
      const extractionResult = createExtractionResult({
        transportDate: {
          confidence: 'low',
          parsed: '01/01/2024' as never,
          rawMatch: 'Data de Transporte: 01/01/2024',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          externalCreatedAt: '2024-06-15',
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });

    it('should not flag when dates match exactly', () => {
      const extractionResult = createExtractionResult({
        transportDate: {
          confidence: 'high',
          parsed: '2024-01-15' as never,
          rawMatch: 'Data de Transporte: 15/01/2024',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          externalCreatedAt: '2024-01-15',
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });

    it('should return no issues when all data matches', () => {
      const extractionResult = createExtractionResult({
        documentNumber: {
          confidence: 'high',
          parsed: '12345' as never,
          rawMatch: 'MTR 12345',
        },
      });

      const result = validateMtrExtractedData(extractionResult, baseEventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });

    const makePickUpEventWithClassification = (
      code?: string,
      description?: string,
    ): DocumentEvent =>
      ({
        metadata: {
          attributes: [
            ...(code === undefined
              ? []
              : [
                  {
                    isPublic: true,
                    name: 'Local Waste Classification ID',
                    value: code,
                  },
                ]),
            ...(description === undefined
              ? []
              : [
                  {
                    isPublic: true,
                    name: 'Local Waste Classification Description',
                    value: description,
                  },
                ]),
          ],
        },
      }) as unknown as DocumentEvent;

    describe('waste type validation', () => {
      it('should not flag when code and description both match', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ code: '190812', description: 'Lodos de tratamento' }],
            rawMatch: '190812-Lodos de tratamento',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should match with description-only when no code on either side', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ description: 'Plástico' }],
            rawMatch: 'Tipo de Resíduo: Plástico',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(undefined, 'Plástico'),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should match with fuzzy description at ~60% threshold', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [
              {
                description:
                  'Lodos de tratamento biológico de águas residuárias',
              },
            ],
            rawMatch: 'Lodos de tratamento biológico',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            undefined,
            'Lodos tratamento biológico águas residuárias',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should match when at least one of multiple waste types matches', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [
              { code: '020101', description: 'Lodos da lavagem' },
              { code: '190812', description: 'Lodos de tratamento' },
            ],
            rawMatch: '020101-Lodos da lavagem\n190812-Lodos de tratamento',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return review reason when no waste type matches', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ code: '020101', description: 'Lodos da lavagem' }],
            rawMatch: '020101-Lodos da lavagem',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento biológico',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(result.reviewReasons?.[0]).toContain('waste types');
      });

      it('should skip validation when event has no waste classification', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ code: '190812', description: 'Lodos' }],
            rawMatch: '190812-Lodos',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should skip validation when no waste types extracted', () => {
        const extractionResult = createExtractionResult({});

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return review reason when code matches but description does not', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [
              { code: '190812', description: 'Something completely different' },
            ],
            rawMatch: '190812-Something completely different',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento biológico',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(result.reviewReasons?.[0]).toContain('waste types');
      });

      it('should normalize waste codes with spaces', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ code: '19 08 12', description: 'Lodos de tratamento' }],
            rawMatch: '19 08 12 - Lodos de tratamento',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return review reason with description-only mismatch', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ description: 'Plástico reciclado' }],
            rawMatch: 'Tipo de Resíduo: Plástico reciclado',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            undefined,
            'Metal ferroso totalmente diferente',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]).toContain('waste types');
        expect(result.reviewReasons?.[0]).toContain(
          'Metal ferroso totalmente diferente',
        );
      });

      it('should return review reason when event has only code and no description', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ description: 'Plástico' }],
            rawMatch: 'Tipo de Resíduo: Plástico',
          },
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification('190812'),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(result.reviewReasons?.[0]).toContain('waste types');
      });

      it('should skip validation when pickUpEvent is missing', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: {
            confidence: 'high',
            parsed: [{ code: '190812', description: 'Lodos' }],
            rawMatch: '190812-Lodos',
          },
        });

        const result = validateMtrExtractedData(
          extractionResult,
          baseEventData,
        );

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });
    });
  });
});
