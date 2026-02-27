import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import { createExtractedWasteTypeEntry } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  stubMtrEntity as stubEntity,
  stubMtrEntityWithHighAddress as stubEntityWithHighAddress,
} from './cross-validation.test-helpers';
import {
  matchWasteTypeEntry,
  type MtrCrossValidationEventData,
  normalizeQuantityToKg,
  validateMtrExtractedData,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './transport-manifest-cross-validation.helpers';

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
  vehiclePlate: {
    confidence: 'high' as const,
    parsed: 'ABC1234',
    rawMatch: 'ABC1234',
  },
  wasteTypes: [
    createExtractedWasteTypeEntry({
      code: '190812',
      description: 'Lodos de tratamento',
    }),
  ],
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

const makeWeighingEvent = (value: number): DocumentEvent =>
  ({ value }) as unknown as DocumentEvent;

const STUB_BR_ADDRESS = { countryCode: 'BR', countryState: 'SP' };

const makePickUpEventWithClassification = (
  code?: string,
  description?: string,
): DocumentEvent =>
  ({
    address: STUB_BR_ADDRESS,
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

describe('transport-manifest-cross-validation.helpers', () => {
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
      manifestType: 'mtr',
      pickUpEvent: undefined,
      recyclerCountryCode: 'BR',
      recyclerEvent: undefined,
      wasteGeneratorEvent: undefined,
      weighingEvents: [],
    };

    it('should return reviewRequired when basic extraction confidence is low', () => {
      const extractionResult = createExtractionResult({
        extractionConfidence: 'low' as never,
      });

      const result = validateMtrExtractedData(extractionResult, baseEventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should set reviewRequired when vehicle plate does not match with high confidence', () => {
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
          address: STUB_BR_ADDRESS,
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
      expect(result.reviewReasons?.[0]?.description).toContain('vehicle plate');
      expect(result.reviewReasons?.[0]?.description).not.toContain('ABC1234');
      expect(result.reviewReasons?.[0]?.description).not.toContain('XYZ9876');
      expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
        expect.objectContaining({
          event: 'XYZ9876',
          extracted: 'ABC1234',
          field: 'value',
        }),
      ]);
    });

    it('should skip vehicle plate validation when extracted plate has low confidence and a parsed value', () => {
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
          address: STUB_BR_ADDRESS,
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
      expect(result.reviewRequired).toBe(false);
    });

    it('should skip vehicle plate validation when extracted plate has low confidence', () => {
      const extractionResult = createExtractionResult({
        vehiclePlate: {
          confidence: 'low',
          parsed: '',
          rawMatch: '',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          address: STUB_BR_ADDRESS,
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
      expect(result.reviewRequired).toBe(false);
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
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'high',
            parsed: 'COMPLETELY DIFFERENT COMPANY' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'high',
            parsed: '12.345.678/0001-90' as never,
            rawMatch: 'some raw text',
          },
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
      expect(result.reviewReasons?.[0]?.description).toContain('receiver name');
      expect(result.reviewReasons?.[0]?.description).toContain('Similarity:');
      expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
        expect.objectContaining({
          event: 'Original Recycler Corp',
          extracted: 'COMPLETELY DIFFERENT COMPANY',
          field: 'name',
          similarity: expect.stringContaining('%'),
        }),
      ]);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should set reviewRequired when generator name does not match', () => {
      const extractionResult = createExtractionResult({
        generator: {
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'high',
            parsed: 'COMPLETELY DIFFERENT GENERATOR' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'high',
            parsed: '12.345.678/0001-90' as never,
            rawMatch: 'some raw text',
          },
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
      expect(result.reviewReasons?.[0]?.description).toContain(
        'generator name',
      );
      expect(result.reviewReasons?.[0]?.description).toContain('Similarity:');
      expect(result.failMessages).toHaveLength(0);
    });

    it('should set reviewRequired when hauler name does not match', () => {
      const extractionResult = createExtractionResult({
        hauler: {
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'high',
            parsed: 'COMPLETELY DIFFERENT HAULER' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'high',
            parsed: '12.345.678/0001-90' as never,
            rawMatch: 'some raw text',
          },
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
      expect(result.reviewReasons?.[0]?.description).toContain('hauler name');
      expect(result.reviewReasons?.[0]?.description).toContain('Similarity:');
      expect(result.failMessages).toHaveLength(0);
    });

    it('should fail when hauler tax ID does not match with high confidence', () => {
      const extractionResult = createExtractionResult({
        hauler: {
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'high',
            parsed: 'Hauler Co' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'high',
            parsed: '99.999.999/0001-99' as never,
            rawMatch: 'some raw text',
          },
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        haulerEvent: {
          participant: {
            name: 'Hauler Co',
            taxId: '22.222.222/0001-22',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(1);
      expect(result.failMessages[0]).toContain('hauler tax ID');
      expect(result.failReasons?.[0]?.comparedFields).toEqual([
        expect.objectContaining({
          event: '22.222.222/0001-22',
          extracted: '99.999.999/0001-99',
          field: 'taxId',
        }),
      ]);
    });

    it('should fail when receiver tax ID does not match with high confidence', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'high',
            parsed: 'Receiver Co' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'high',
            parsed: '99.999.999/0001-99' as never,
            rawMatch: 'some raw text',
          },
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
      expect(result.failReasons?.[0]?.comparedFields).toEqual([
        expect.objectContaining({
          event: '11.111.111/0001-11',
          extracted: '99.999.999/0001-99',
          field: 'taxId',
        }),
      ]);
    });

    it('should not fail when tax IDs match after normalization', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'high',
            parsed: 'Receiver Co' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'high',
            parsed: '11111111000111' as never,
            rawMatch: 'some raw text',
          },
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
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'low',
            parsed: 'Receiver Co' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'low',
            parsed: '99.999.999/0001-99' as never,
            rawMatch: 'some raw text',
          },
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
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'low',
            parsed: 'Different Company' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'low',
            parsed: '12.345.678/0001-90' as never,
            rawMatch: 'some raw text',
          },
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
          address: { confidence: 'low', parsed: '' as never },
          city: { confidence: 'low', parsed: '' as never },
          name: {
            confidence: 'high',
            parsed: 'Recycler Corp' as never,
            rawMatch: 'some raw text',
          },
          state: { confidence: 'low', parsed: '' as never },
          taxId: {
            confidence: 'high',
            parsed: '12.345.678/0001-90' as never,
            rawMatch: 'some raw text',
          },
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
          address: STUB_BR_ADDRESS,
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
          address: STUB_BR_ADDRESS,
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
          address: STUB_BR_ADDRESS,
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
          address: STUB_BR_ADDRESS,
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
          address: STUB_BR_ADDRESS,
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
          address: STUB_BR_ADDRESS,
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
          address: STUB_BR_ADDRESS,
          externalCreatedAt: '2024-01-15',
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });

    it('should fail when event issueDateAttribute does not match extracted issue date', () => {
      const extractionResult = createExtractionResult({
        issueDate: {
          confidence: 'high' as const,
          parsed: '2024-06-15' as never,
          rawMatch: '15/06/2024',
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        issueDateAttribute: {
          isPublic: false,
          name: 'Issue Date',
          value: '2024-01-01T12:00:00.000Z',
        },
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(1);
      expect(result.failMessages[0]).toContain('2024-01-01T12:00:00.000Z');
      expect(result.failMessages[0]).toContain('2024-06-15');
    });

    it('should add review reason when event has issueDateAttribute but issue date was not extracted', () => {
      const extractionResult = {
        data: {
          ...baseMtrData,
          extractionConfidence: 'high' as const,
          issueDate: undefined,
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        issueDateAttribute: {
          isPublic: false,
          name: 'Issue Date',
          value: '2024-01-01',
        },
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons?.[0]?.code).toBe('FIELD_NOT_EXTRACTED');
      expect(result.reviewReasons?.[0]?.description).toContain('issue date');
    });

    it('should not fail when event issueDateAttribute matches extracted issue date', () => {
      const extractionResult = createExtractionResult({});

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        issueDateAttribute: {
          isPublic: false,
          name: 'Issue Date',
          value: '2024-01-01T12:00:00.000Z',
        },
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });

    it('should fail when document number does not match', () => {
      const extractionResult = createExtractionResult({
        documentNumber: {
          confidence: 'high',
          parsed: '99999',
          rawMatch: '99999',
        },
      });

      const result = validateMtrExtractedData(extractionResult, baseEventData);

      expect(result.failMessages.length).toBeGreaterThan(0);
      expect(result.failReasons?.[0]?.description).toContain('Document Number');
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

    it('should default recyclerCountryCode to BR when undefined', () => {
      const extractionResult = createExtractionResult({});

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerCountryCode: undefined,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
    });

    describe('waste type validation', () => {
      it('should not flag when code and description both match', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
            }),
          ],
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
          wasteTypes: [
            createExtractedWasteTypeEntry({ description: 'Plástico' }),
          ],
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
          wasteTypes: [
            createExtractedWasteTypeEntry({
              description: 'Lodos de tratamento biológico de águas residuárias',
            }),
          ],
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
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '020101',
              description: 'Lodos da lavagem',
            }),
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
            }),
          ],
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
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '020101',
              description: 'Lodos da lavagem',
            }),
          ],
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
        expect(result.reviewReasons?.[0]?.description).toContain('waste types');
        expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
          expect.objectContaining({
            field: 'wasteType',
          }),
        ]);
      });

      it('should skip validation when event has no waste classification', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should set reviewRequired when waste types not extracted but pickUpEvent exists', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: undefined as never,
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
        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(
          result.reviewReasons?.some((r) =>
            r.description.includes('waste type entries'),
          ),
        ).toBe(true);
      });

      it('should set reviewRequired when all waste type entries have no meaningful code or description', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [createExtractedWasteTypeEntry({ description: '' })],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.code).toBe('FIELD_NOT_EXTRACTED');
      });

      it('should return review reason when code matches but description does not', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Something completely different',
            }),
          ],
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
        expect(result.reviewReasons?.[0]?.description).toContain('waste types');
      });

      it('should normalize waste codes with spaces', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '19 08 12',
              description: 'Lodos de tratamento',
            }),
          ],
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
          wasteTypes: [
            createExtractedWasteTypeEntry({
              description: 'Plástico reciclado',
            }),
          ],
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
        expect(result.reviewReasons?.[0]?.description).toContain('waste types');
        expect(result.reviewReasons?.[0]?.description).toContain(
          'Metal ferroso totalmente diferente',
        );
      });

      it('should return review reason when event has only code and no description', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({ description: 'Plástico' }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification('190812'),
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(result.reviewReasons?.[0]?.description).toContain('waste types');
      });

      it('should skip validation when pickUpEvent is missing', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos',
            }),
          ],
        });

        const result = validateMtrExtractedData(
          extractionResult,
          baseEventData,
        );

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });
    });

    describe('waste quantity weight validation', () => {
      it('should set reviewRequired when no wasteTypes in extracted data but pickUpEvent exists', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: undefined as never,
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(
          result.reviewReasons?.some((r) =>
            r.description.includes('waste type entries'),
          ),
        ).toBe(true);
      });

      it('should flag document for review when extracted and event waste types differ', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '020101',
              description: 'Lodos da lavagem',
              quantity: 500,
              unit: 'kg',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(true);
      });

      it('should return no issues when matched entry has no quantity', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return no issues when unit is volumetric (m³)', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 5,
              unit: 'm³',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return no issues when no weighing events', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 500,
              unit: 'kg',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return no issues when within 10% threshold', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 950,
              unit: 'kg',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return review reason when exceeding 10% threshold', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 500,
              unit: 'kg',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(result.reviewReasons?.[0]?.description).toContain(
          'waste quantity',
        );
        expect(result.reviewReasons?.[0]?.description).toContain('500');
        expect(result.reviewReasons?.[0]?.description).toContain('1000');
        expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
          expect.objectContaining({
            event: '1000 kg',
            extracted: '500 kg',
            field: 'wasteQuantity',
          }),
        ]);
      });

      it('should correctly normalize ton units to kg', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 2,
              unit: 'ton',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(2000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should correctly normalize "t" unit to kg', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 5,
              unit: 't',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(4000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain(
          'waste quantity',
        );
      });

      it('should use first weighing event with valid value', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 1000,
              unit: 'kg',
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [
            { value: 0 } as unknown as DocumentEvent,
            makeWeighingEvent(1000),
            makeWeighingEvent(2000),
          ],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should show "kg" in review reason when unit is undefined and discrepancy exceeds threshold', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 500,
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain('500 kg');
      });

      it('should treat undefined unit as kg', () => {
        const extractionResult = createExtractionResult({
          wasteTypes: [
            createExtractedWasteTypeEntry({
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 1000,
            }),
          ],
        });

        const eventData: MtrCrossValidationEventData = {
          ...baseEventData,
          pickUpEvent: makePickUpEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateMtrExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });
    });
  });

  describe('normalizeQuantityToKg', () => {
    it('should return quantity as-is when unit is undefined', () => {
      expect(normalizeQuantityToKg(100, undefined)).toBe(100);
    });

    it('should return quantity as-is when unit is kg', () => {
      expect(normalizeQuantityToKg(100, 'kg')).toBe(100);
    });

    it('should return quantity as-is when unit is KG (case-insensitive)', () => {
      expect(normalizeQuantityToKg(100, 'KG')).toBe(100);
    });

    it('should multiply by 1000 when unit is ton', () => {
      expect(normalizeQuantityToKg(2, 'ton')).toBe(2000);
    });

    it('should multiply by 1000 when unit is t', () => {
      expect(normalizeQuantityToKg(3, 't')).toBe(3000);
    });

    it('should multiply by 1000 when unit is TON (case-insensitive)', () => {
      expect(normalizeQuantityToKg(1.5, 'TON')).toBe(1500);
    });

    it('should return undefined for m³', () => {
      expect(normalizeQuantityToKg(5, 'm³')).toBeUndefined();
    });

    it('should return undefined for unknown units', () => {
      expect(normalizeQuantityToKg(5, 'liters')).toBeUndefined();
    });
  });

  describe('WEIGHT_DISCREPANCY_THRESHOLD', () => {
    it('should be 0.1 (10%)', () => {
      expect(WEIGHT_DISCREPANCY_THRESHOLD).toBe(0.1);
    });
  });

  describe('address validation in validateMtrExtractedData', () => {
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
      manifestType: 'mtr',
      pickUpEvent: undefined,
      recyclerCountryCode: 'BR',
      recyclerEvent: undefined,
      wasteGeneratorEvent: undefined,
      weighingEvents: [],
    };

    it('should set reviewRequired when receiver address does not match', () => {
      const extractionResult = createExtractionResult({
        receiver: stubEntityWithHighAddress(
          'Receiver Co',
          '33.333.333/0001-33',
          'Rua Completamente Diferente 999',
          'Rio de Janeiro',
          'RJ',
        ),
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          address: {
            city: 'Curitiba',
            countryState: 'PR',
            number: '100',
            street: 'Av Brasil',
          },
          participant: {
            name: 'Receiver Co',
            taxId: '33.333.333/0001-33',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();

      const addressReason = result.reviewReasons?.find((r) =>
        r.description.includes('receiver address'),
      );

      expect(addressReason).toBeDefined();
    });

    it('should set reviewRequired when generator address does not match', () => {
      const extractionResult = createExtractionResult({
        generator: stubEntityWithHighAddress(
          'Generator Co',
          '11.111.111/0001-11',
          'Rua Totalmente Diferente 888',
          'Porto Alegre',
          'RS',
        ),
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        wasteGeneratorEvent: {
          address: {
            city: 'Belo Horizonte',
            countryState: 'MG',
            number: '200',
            street: 'Av Amazonas',
          },
          participant: {
            name: 'Generator Co',
            taxId: '11.111.111/0001-11',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();

      const addressReason = result.reviewReasons?.find((r) =>
        r.description.includes('generator address'),
      );

      expect(addressReason).toBeDefined();
    });

    it('should not set reviewRequired when hauler address does not match', () => {
      const extractionResult = createExtractionResult({
        hauler: stubEntityWithHighAddress(
          'Hauler Co',
          '22.222.222/0001-22',
          'Rua Outra Endereco 777',
          'Salvador',
          'BA',
        ),
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        haulerEvent: {
          address: {
            city: 'Recife',
            countryState: 'PE',
            number: '300',
            street: 'Av Boa Viagem',
          },
          participant: {
            name: 'Hauler Co',
            taxId: '22.222.222/0001-22',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewReasons ?? []).toHaveLength(0);
    });

    it('should skip address validation when address confidence is low', () => {
      const extractionResult = createExtractionResult({
        receiver: {
          address: { confidence: 'low', parsed: 'Different Address' as never },
          city: { confidence: 'low', parsed: 'Different City' as never },
          name: {
            confidence: 'high',
            parsed: 'Receiver Co' as never,
            rawMatch: 'Receiver Co',
          },
          state: { confidence: 'low', parsed: 'XX' as never },
          taxId: {
            confidence: 'high',
            parsed: '33.333.333/0001-33' as never,
            rawMatch: '33.333.333/0001-33',
          },
        },
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          address: {
            city: 'Curitiba',
            countryState: 'PR',
            number: '100',
            street: 'Av Brasil',
          },
          participant: {
            name: 'Receiver Co',
            taxId: '33.333.333/0001-33',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });
  });

  describe('not-extracted field detection', () => {
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
      manifestType: 'mtr',
      pickUpEvent: undefined,
      recyclerCountryCode: 'BR',
      recyclerEvent: undefined,
      wasteGeneratorEvent: undefined,
      weighingEvents: [],
    };

    it('should set reviewRequired when receiver is not extracted but recyclerEvent exists', () => {
      const extractionResult = createExtractionResult({
        receiver: undefined as never,
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: {
            name: 'Recycler Corp',
            taxId: '33.333.333/0001-33',
          },
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();
      expect(
        result.reviewReasons?.some((r) =>
          r.description.includes('receiver name'),
        ),
      ).toBe(true);
      expect(
        result.reviewReasons?.some((r) =>
          r.description.includes('receiver tax ID'),
        ),
      ).toBe(true);
    });

    it('should set reviewRequired when transport date is not extracted but pickUpEvent has date', () => {
      const extractionResult = createExtractionResult({
        transportDate: undefined as never,
      });

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        pickUpEvent: {
          address: STUB_BR_ADDRESS,
          externalCreatedAt: '2024-01-15',
        } as unknown as DocumentEvent,
      };

      const result = validateMtrExtractedData(extractionResult, eventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toBeDefined();
      expect(
        result.reviewReasons?.some((r) =>
          r.description.includes('transport date'),
        ),
      ).toBe(true);
    });

    it('should not flag not-extracted when both extracted and event data are undefined', () => {
      const extractionResult = createExtractionResult({
        receiver: undefined as never,
        vehiclePlate: undefined as never,
        wasteTypes: undefined as never,
      });

      const result = validateMtrExtractedData(extractionResult, baseEventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });
  });

  describe('re-exported helpers', () => {
    it('should re-export matchWasteTypeEntry from shared helpers', () => {
      const result = matchWasteTypeEntry(
        { code: '01 01 01', description: 'Waste', quantity: 100 },
        '01 01 01',
        'Waste',
      );

      expect(result.isMatch).toBe(true);
    });
  });
});
