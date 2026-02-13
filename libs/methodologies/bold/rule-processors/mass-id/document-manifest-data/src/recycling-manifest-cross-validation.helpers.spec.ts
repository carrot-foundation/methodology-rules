import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  type CdfCrossValidationEventData,
  collectMtrDocumentNumbers,
  validateCdfExtractedData,
} from './recycling-manifest-cross-validation.helpers';

const stubEntity = (name: string, taxId: string) => ({
  name: { confidence: 'high' as const, parsed: name, rawMatch: name },
  taxId: { confidence: 'high' as const, parsed: taxId, rawMatch: taxId },
});

const stubEntityWithAddress = (
  name: string,
  taxId: string,
  address: string,
  city: string,
  state: string,
) => ({
  ...stubEntity(name, taxId),
  address: { confidence: 'high' as const, parsed: address, rawMatch: address },
  city: { confidence: 'high' as const, parsed: city, rawMatch: city },
  state: { confidence: 'high' as const, parsed: state, rawMatch: state },
});

const baseCdfData = {
  documentNumber: {
    confidence: 'high' as const,
    parsed: 'CDF-001',
    rawMatch: 'CDF-001',
  },
  documentType: 'recyclingManifest' as const,
  generator: stubEntityWithAddress(
    'Generator Co',
    '11.111.111/0001-11',
    'Rua das Flores 123',
    'Sao Paulo',
    'SP',
  ),
  issueDate: {
    confidence: 'high' as const,
    parsed: '2024-01-01',
    rawMatch: '01/01/2024',
  },
  recycler: stubEntity('Recycler Corp', '33.333.333/0001-33'),
  wasteEntries: {
    confidence: 'high' as const,
    parsed: [{ code: '190812', description: 'Lodos de tratamento' }],
    rawMatch: '190812 - Lodos de tratamento',
  },
};

const createExtractionResult = (
  data: Partial<CdfExtractedData>,
): ExtractionOutput<BaseExtractedData> =>
  ({
    data: {
      ...baseCdfData,
      extractionConfidence: 'high',
      ...data,
    },
    reviewReasons: [],
    reviewRequired: false,
  }) as unknown as ExtractionOutput<BaseExtractedData>;

const makeWeighingEvent = (value: number): DocumentEvent =>
  ({ value }) as unknown as DocumentEvent;

const makeDropOffEventWithClassification = (
  code?: string,
  description?: string,
  externalCreatedAt?: string,
): DocumentEvent =>
  ({
    externalCreatedAt,
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

describe('recycling-manifest-cross-validation.helpers', () => {
  describe('validateCdfExtractedData', () => {
    const baseEventData: CdfCrossValidationEventData = {
      attachment: undefined,
      documentNumber: 'CDF-001',
      documentType: 'CDF',
      dropOffEvent: undefined,
      eventAddressId: 'addr-1',
      eventValue: 100,
      exemptionJustification: undefined,
      hasWrongLabelAttachment: false,
      issueDateAttribute: undefined,
      mtrDocumentNumbers: [],
      recyclerCountryCode: 'BR',
      recyclerEvent: undefined,
      wasteGeneratorEvent: undefined,
      weighingEvents: [],
    };

    it('should return reviewRequired when basic extraction confidence is low', () => {
      const extractionResult = createExtractionResult({
        extractionConfidence: 'low' as never,
      });

      const result = validateCdfExtractedData(extractionResult, baseEventData);

      expect(result.reviewRequired).toBe(true);
      expect(result.failMessages).toHaveLength(0);
    });

    it('should return no issues when all data matches', () => {
      const extractionResult = createExtractionResult({});

      const result = validateCdfExtractedData(extractionResult, baseEventData);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewRequired).toBe(false);
    });

    describe('recycler validation', () => {
      it('should set reviewRequired when recycler name does not match', () => {
        const extractionResult = createExtractionResult({
          recycler: stubEntity(
            'COMPLETELY DIFFERENT COMPANY',
            '33.333.333/0001-33',
          ),
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          recyclerEvent: {
            participant: { name: 'Recycler Corp', taxId: '33.333.333/0001-33' },
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain(
          'recycler name',
        );
        expect(result.reviewReasons?.[0]?.description).toContain('Similarity:');
        expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
          expect.objectContaining({
            event: 'Recycler Corp',
            extracted: 'COMPLETELY DIFFERENT COMPANY',
            field: 'name',
            similarity: expect.stringContaining('%'),
          }),
        ]);
      });

      it('should fail when recycler tax ID does not match with high confidence', () => {
        const extractionResult = createExtractionResult({
          recycler: stubEntity('Recycler Corp', '99.999.999/0001-99'),
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          recyclerEvent: {
            participant: { name: 'Recycler Corp', taxId: '33.333.333/0001-33' },
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(1);
        expect(result.failMessages[0]).toContain('recycler tax ID');
        expect(result.failReasons?.[0]?.comparedFields).toEqual([
          expect.objectContaining({
            event: '33.333.333/0001-33',
            extracted: '99.999.999/0001-99',
            field: 'taxId',
          }),
        ]);
      });
    });

    describe('generator validation', () => {
      it('should set reviewRequired when generator name does not match', () => {
        const extractionResult = createExtractionResult({
          generator: stubEntityWithAddress(
            'COMPLETELY DIFFERENT GENERATOR',
            '11.111.111/0001-11',
            'Rua das Flores 123',
            'Sao Paulo',
            'SP',
          ),
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          wasteGeneratorEvent: {
            participant: {
              name: 'Generator Co',
              taxId: '11.111.111/0001-11',
            },
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain(
          'generator name',
        );
      });

      it('should fail when generator tax ID does not match', () => {
        const extractionResult = createExtractionResult({
          generator: stubEntityWithAddress(
            'Generator Co',
            '99.999.999/0001-99',
            'Rua das Flores 123',
            'Sao Paulo',
            'SP',
          ),
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          wasteGeneratorEvent: {
            participant: {
              name: 'Generator Co',
              taxId: '11.111.111/0001-11',
            },
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(1);
        expect(result.failMessages[0]).toContain('generator tax ID');
      });

      it('should set reviewRequired when generator address does not match', () => {
        const extractionResult = createExtractionResult({
          generator: stubEntityWithAddress(
            'Rua Completamente Diferente 999',
            '11.111.111/0001-11',
            'Rio de Janeiro',
            'RJ',
            'high',
          ),
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          wasteGeneratorEvent: {
            address: {
              city: 'Curitiba',
              countryState: 'PR',
              number: '100',
              street: 'Av Brasil',
            },
            participant: {
              name: 'Generator Co',
              taxId: '11.111.111/0001-11',
            },
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();

        const addressReason = result.reviewReasons?.find((r) =>
          r.description.includes('generator address'),
        );

        expect(addressReason).toBeDefined();
      });
    });

    describe('drop-off date within CDF period', () => {
      it('should return no issues when drop-off date is within period', () => {
        const extractionResult = createExtractionResult({
          processingPeriod: {
            confidence: 'high',
            parsed: '01/01/2024 ate 31/01/2024',
            rawMatch: '01/01/2024 ate 31/01/2024',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: {
            externalCreatedAt: '2024-01-15',
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should fail when drop-off date is outside period (high confidence)', () => {
        const extractionResult = createExtractionResult({
          processingPeriod: {
            confidence: 'high',
            parsed: '01/01/2024 ate 31/01/2024',
            rawMatch: '01/01/2024 ate 31/01/2024',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: {
            externalCreatedAt: '2024-03-15',
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages.length).toBeGreaterThan(0);
        expect(result.failMessages[0]).toContain('Drop-off event date');
      });

      it('should set reviewRequired when drop-off date is outside period (low confidence)', () => {
        const extractionResult = createExtractionResult({
          processingPeriod: {
            confidence: 'low',
            parsed: '01/01/2024 ate 31/01/2024',
            rawMatch: '01/01/2024 ate 31/01/2024',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: {
            externalCreatedAt: '2024-03-15',
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain(
          'Drop-off event date',
        );
      });
    });

    describe('MTR number cross-reference', () => {
      it('should return no issues when MTR number is found in CDF transport manifests', () => {
        const extractionResult = createExtractionResult({
          transportManifests: {
            confidence: 'high',
            parsed: ['MTR-001', 'MTR-002'],
            rawMatch: 'MTR-001, MTR-002',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          mtrDocumentNumbers: ['MTR-001'],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should set reviewRequired when MTR number is not found in CDF', () => {
        const extractionResult = createExtractionResult({
          transportManifests: {
            confidence: 'high',
            parsed: ['MTR-999'],
            rawMatch: 'MTR-999',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          mtrDocumentNumbers: ['MTR-001'],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain('MTR-001');
        expect(result.reviewReasons?.[0]?.description).toContain('not found');
        expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
          expect.objectContaining({
            event: 'MTR-001',
            extracted: 'MTR-999',
            field: 'mtrNumber',
          }),
        ]);
      });

      it('should skip when no MTR document numbers', () => {
        const extractionResult = createExtractionResult({
          transportManifests: {
            confidence: 'high',
            parsed: ['MTR-001'],
            rawMatch: 'MTR-001',
          },
        });

        const result = validateCdfExtractedData(
          extractionResult,
          baseEventData,
        );

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should set reviewRequired when no transport manifests extracted but MTR numbers exist', () => {
        const extractionResult = createExtractionResult({
          transportManifests: undefined as never,
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          mtrDocumentNumbers: ['MTR-001'],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(
          result.reviewReasons?.some((r) =>
            r.description.includes('transport manifest numbers'),
          ),
        ).toBe(true);
      });
    });

    describe('waste type validation', () => {
      it('should not flag when waste type matches by code and description', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [{ code: '190812', description: 'Lodos de tratamento' }],
            rawMatch: '190812-Lodos de tratamento',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should match with description-only when no code on either side', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [{ description: 'Plastico' }],
            rawMatch: 'Plastico',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            undefined,
            'Plastico',
          ),
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should skip validation when event has no waste classification', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [{ code: '190812', description: 'Lodos' }],
            rawMatch: '190812-Lodos',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(),
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return review reason when no waste type matches', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [{ code: '020101', description: 'Lodos da lavagem' }],
            rawMatch: '020101-Lodos da lavagem',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento biologico',
          ),
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain('waste types');
        expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
          expect.objectContaining({
            field: 'wasteType',
          }),
        ]);
      });
    });

    describe('waste quantity validation', () => {
      it('should return no issues when within 10% threshold', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [
              {
                code: '190812',
                description: 'Lodos de tratamento',
                quantity: 950,
                unit: 'kg',
              },
            ],
            rawMatch: '190812-Lodos de tratamento',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return no issues when unit is volumetric (m³)', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [
              {
                code: '190812',
                description: 'Lodos de tratamento',
                quantity: 5,
                unit: 'm³',
              },
            ],
            rawMatch: '190812-Lodos de tratamento',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return no issues when no weighing events with valid value', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [
              {
                code: '190812',
                description: 'Lodos de tratamento',
                quantity: 500,
                unit: 'kg',
              },
            ],
            rawMatch: '190812-Lodos de tratamento',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });

      it('should return review reason when exceeding 10% threshold', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [
              {
                code: '190812',
                description: 'Lodos de tratamento',
                quantity: 500,
                unit: 'kg',
              },
            ],
            rawMatch: '190812-Lodos de tratamento',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain(
          'waste quantity',
        );
        expect(result.reviewReasons?.[0]?.description).toContain(
          'recycling manifest',
        );
        expect(result.reviewReasons?.[0]?.comparedFields).toEqual([
          expect.objectContaining({
            event: '1000 kg',
            extracted: '500 kg',
            field: 'wasteQuantity',
          }),
        ]);
      });

      it('should show "kg" in review reason when unit is undefined and discrepancy exceeds threshold', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [
              {
                code: '190812',
                description: 'Lodos de tratamento',
                quantity: 500,
              },
            ],
            rawMatch: '190812-Lodos de tratamento',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
          weighingEvents: [makeWeighingEvent(1000)],
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain('500 kg');
      });

      it('should return review reason with description-only mismatch for CDF events', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: {
            confidence: 'high',
            parsed: [{ description: 'Plastico reciclado' }],
            rawMatch: 'Plastico reciclado',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            undefined,
            'Metal ferroso totalmente diferente',
          ),
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons?.[0]?.description).toContain(
          'Metal ferroso totalmente diferente',
        );
      });
    });

    describe('full integration', () => {
      it('should combine all validations', () => {
        const extractionResult = createExtractionResult({
          processingPeriod: {
            confidence: 'high',
            parsed: '01/01/2024 ate 31/01/2024',
            rawMatch: '01/01/2024 ate 31/01/2024',
          },
          recycler: stubEntity(
            'COMPLETELY DIFFERENT RECYCLER',
            '99.999.999/0001-99',
          ),
          transportManifests: {
            confidence: 'high',
            parsed: ['MTR-999'],
            rawMatch: 'MTR-999',
          },
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: {
            externalCreatedAt: '2024-03-15',
          } as unknown as DocumentEvent,
          mtrDocumentNumbers: ['MTR-001'],
          recyclerEvent: {
            participant: { name: 'Recycler Corp', taxId: '33.333.333/0001-33' },
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.failMessages.length).toBeGreaterThan(0);
        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(result.reviewReasons!.length).toBeGreaterThan(0);
      });
    });

    describe('not-extracted field detection', () => {
      it('should set reviewRequired when recycler is not extracted but recyclerEvent exists', () => {
        const extractionResult = createExtractionResult({
          recycler: undefined as never,
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          recyclerEvent: {
            participant: {
              name: 'Recycler Corp',
              taxId: '33.333.333/0001-33',
            },
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(
          result.reviewReasons?.some((r) =>
            r.description.includes('recycler name'),
          ),
        ).toBe(true);
        expect(
          result.reviewReasons?.some((r) =>
            r.description.includes('recycler tax ID'),
          ),
        ).toBe(true);
      });

      it('should set reviewRequired when waste entries not extracted but dropOffEvent exists', () => {
        const extractionResult = createExtractionResult({
          wasteEntries: undefined as never,
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: makeDropOffEventWithClassification(
            '190812',
            'Lodos de tratamento',
          ),
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(
          result.reviewReasons?.some((r) =>
            r.description.includes('waste type entries'),
          ),
        ).toBe(true);
      });

      it('should set reviewRequired when processing period not extracted but dropOffEvent has date', () => {
        const extractionResult = createExtractionResult({
          processingPeriod: undefined as never,
        });

        const eventData: CdfCrossValidationEventData = {
          ...baseEventData,
          dropOffEvent: {
            externalCreatedAt: '2024-01-15',
          } as unknown as DocumentEvent,
        };

        const result = validateCdfExtractedData(extractionResult, eventData);

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toBeDefined();
        expect(
          result.reviewReasons?.some((r) =>
            r.description.includes('processing period'),
          ),
        ).toBe(true);
      });

      it('should not flag not-extracted when both extracted and event data are undefined', () => {
        const extractionResult = createExtractionResult({
          recycler: undefined as never,
        });

        const result = validateCdfExtractedData(
          extractionResult,
          baseEventData,
        );

        expect(result.failMessages).toHaveLength(0);
        expect(result.reviewRequired).toBe(false);
      });
    });
  });

  describe('collectMtrDocumentNumbers', () => {
    it('should collect MTR document numbers from events', () => {
      const events = [
        { documentNumber: 'MTR-001', documentType: 'MTR' },
        { documentNumber: 'CDF-001', documentType: 'CDF' },
        { documentNumber: 'MTR-002', documentType: 'MTR' },
      ] as never[];

      const result = collectMtrDocumentNumbers(events);

      expect(result).toEqual(['MTR-001', 'MTR-002']);
    });

    it('should return empty array when no MTR events', () => {
      const events = [
        { documentNumber: 'CDF-001', documentType: 'CDF' },
      ] as never[];

      const result = collectMtrDocumentNumbers(events);

      expect(result).toEqual([]);
    });

    it('should filter out empty document numbers', () => {
      const events = [
        { documentNumber: '', documentType: 'MTR' },
        { documentNumber: undefined, documentType: 'MTR' },
        { documentNumber: 'MTR-003', documentType: 'MTR' },
      ] as never[];

      const result = collectMtrDocumentNumbers(events);

      expect(result).toEqual(['MTR-003']);
    });
  });
});
