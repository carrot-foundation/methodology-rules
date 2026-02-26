import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import { createExtractedWasteTypeEntry } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import { logger } from '@carrot-fndn/shared/helpers';

import type { CdfCrossValidationEventData } from './recycling-manifest-cross-validation.helpers';
import type { MtrCrossValidationEventData } from './transport-manifest-cross-validation.helpers';

import {
  buildCdfCrossValidationComparison,
  buildCrossValidationComparison,
} from './cross-validation-debug.helpers';
import {
  stubEntity,
  stubEntityWithAddress,
} from './cross-validation.test-helpers';

const baseExtractedData: MtrExtractedData = {
  documentNumber: {
    confidence: 'high',
    parsed: '12345',
    rawMatch: '12345',
  },
  documentType: 'transportManifest',
  generator: stubEntity('Generator Co', '11.111.111/0001-11'),
  hauler: stubEntity('Hauler Co', '22.222.222/0001-22'),
  issueDate: {
    confidence: 'high',
    parsed: '2024-01-01',
    rawMatch: '01/01/2024',
  },
  receiver: stubEntity('Receiver Co', '33.333.333/0001-33'),
} as unknown as MtrExtractedData;

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

describe('cross-validation-debug.helpers', () => {
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation();
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  describe('buildCrossValidationComparison', () => {
    it('should return crossValidation object and log it', () => {
      const result = buildCrossValidationComparison(
        baseExtractedData,
        baseEventData,
        'high',
      );

      expect(result).toBeDefined();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          crossValidation: expect.objectContaining({
            documentNumber: expect.objectContaining({
              confidence: 'high',
              isMatch: true,
            }),
          }),
          extractionConfidence: 'high',
        }),
        'Cross-validation field comparison (MTR)',
      );
    });

    it('should always include values in the returned object', () => {
      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        haulerEvent: {
          participant: { name: 'Hauler Co', taxId: '22.222.222/0001-22' },
        } as unknown as DocumentEvent,
        recyclerEvent: {
          participant: { name: 'Receiver Co', taxId: '33.333.333/0001-33' },
        } as unknown as DocumentEvent,
        wasteGeneratorEvent: {
          participant: { name: 'Generator Co', taxId: '11.111.111/0001-11' },
        } as unknown as DocumentEvent,
      };

      const result = buildCrossValidationComparison(
        baseExtractedData,
        eventData,
        'high',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber).toHaveProperty('event', '12345');
      expect(documentNumber).toHaveProperty('extracted', '12345');

      const generator = result['generator'] as Record<string, unknown>;

      expect(generator).toHaveProperty('extractedName', 'Generator Co');
      expect(generator).toHaveProperty('eventName', 'Generator Co');
      expect(generator).toHaveProperty('extractedTaxId', '11.111.111/0001-11');
      expect(generator).toHaveProperty('eventTaxId', '11.111.111/0001-11');
    });

    it('should handle null fallbacks with minimal event data', () => {
      const extractedData: MtrExtractedData = {
        ...baseExtractedData,
        wasteTypes: [
          createExtractedWasteTypeEntry({ description: 'Lodos de tratamento' }),
        ],
      } as unknown as MtrExtractedData;

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        documentNumber: undefined,
      };

      const result = buildCrossValidationComparison(
        extractedData,
        eventData,
        'high',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber).toHaveProperty('event', null);

      const generator = result['generator'] as Record<string, unknown>;

      expect(generator).toHaveProperty('eventName', null);
      expect(generator).toHaveProperty('eventTaxId', null);
      expect(generator).toHaveProperty('extractedName', 'Generator Co');

      expect(result['receivingDate']).toHaveProperty('event', null);
      expect(result['receivingDate']).toHaveProperty('extracted', null);
      expect(result['transportDate']).toHaveProperty('event', null);
      expect(result['transportDate']).toHaveProperty('extracted', null);
      expect(result['vehiclePlate']).toHaveProperty('event', null);
      expect(result['vehiclePlate']).toHaveProperty('extracted', null);

      const wasteType = result['wasteType'] as Record<string, unknown>;

      expect(wasteType).toHaveProperty('eventCode', null);
      expect(wasteType).toHaveProperty('eventDescription', null);

      const entries = wasteType['entries'] as Array<Record<string, unknown>>;

      expect(entries[0]).toHaveProperty('extracted', 'Lodos de tratamento');
    });

    it('should include all fields with full event data', () => {
      const extractedData: MtrExtractedData = {
        ...baseExtractedData,
        receivingDate: {
          confidence: 'high',
          parsed: '2024-01-15',
          rawMatch: '15/01/2024',
        },
        transportDate: {
          confidence: 'high',
          parsed: '2024-01-10',
          rawMatch: '10/01/2024',
        },
        vehiclePlate: {
          confidence: 'high',
          parsed: 'ABC1234',
          rawMatch: 'ABC1234',
        },
        wasteTypes: [
          createExtractedWasteTypeEntry({
            code: '190812',
            description: 'Lodos de tratamento',
          }),
        ],
      } as unknown as MtrExtractedData;

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        dropOffEvent: {
          externalCreatedAt: '2024-01-15',
        } as unknown as DocumentEvent,
        haulerEvent: {
          participant: { name: 'Hauler Co', taxId: '22.222.222/0001-22' },
        } as unknown as DocumentEvent,
        pickUpEvent: {
          externalCreatedAt: '2024-01-10',
          metadata: {
            attributes: [
              {
                isPublic: true,
                name: 'Vehicle License Plate',
                value: 'ABC1234',
              },
              {
                isPublic: true,
                name: 'Local Waste Classification ID',
                value: '190812',
              },
              {
                isPublic: true,
                name: 'Local Waste Classification Description',
                value: 'Lodos de tratamento',
              },
            ],
          },
        } as unknown as DocumentEvent,
        recyclerEvent: {
          participant: { name: 'Receiver Co', taxId: '33.333.333/0001-33' },
        } as unknown as DocumentEvent,
        wasteGeneratorEvent: {
          participant: { name: 'Generator Co', taxId: '11.111.111/0001-11' },
        } as unknown as DocumentEvent,
      };

      const result = buildCrossValidationComparison(
        extractedData,
        eventData,
        'high',
      );

      expect(result['issueDate']).toHaveProperty('event', null);
      expect(result['issueDate']).toHaveProperty('extracted', '2024-01-01');
      expect(result['receivingDate']).toHaveProperty('event', '2024-01-15');
      expect(result['transportDate']).toHaveProperty('event', '2024-01-10');
      expect(result['vehiclePlate']).toHaveProperty('event', 'ABC1234');
      expect(result['vehiclePlate']).toHaveProperty('isMatch', true);

      const wasteType = result['wasteType'] as Record<string, unknown>;
      const entries = wasteType['entries'] as Array<Record<string, unknown>>;

      expect(entries[0]).toHaveProperty(
        'extracted',
        '190812 - Lodos de tratamento',
      );
      expect(wasteType).toHaveProperty('eventCode', '190812');
      expect(wasteType).toHaveProperty(
        'eventDescription',
        'Lodos de tratamento',
      );
    });

    it('should return entity similarity and taxId match metadata', () => {
      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        recyclerEvent: {
          participant: { name: 'Receiver Co', taxId: '33.333.333/0001-33' },
        } as unknown as DocumentEvent,
        wasteGeneratorEvent: {
          participant: {
            name: 'Different Generator',
            taxId: '99.999.999/0001-99',
          },
        } as unknown as DocumentEvent,
      };

      const result = buildCrossValidationComparison(
        baseExtractedData,
        eventData,
        'high',
      );

      const receiver = result['receiver'] as Record<string, unknown>;

      expect(receiver['nameSimilarity']).toBe('100%');
      expect(receiver['taxIdMatch']).toBe(true);

      const generator = result['generator'] as Record<string, unknown>;

      expect(generator['taxIdMatch']).toBe(false);
      expect(generator['nameSimilarity']).not.toBe('100%');

      const hauler = result['hauler'] as Record<string, unknown>;

      expect(hauler['confidence']).toBe('high');
      expect(hauler['nameSimilarity']).toBeNull();
      expect(hauler['taxIdMatch']).toBeNull();
    });

    it('should handle missing document number in event data', () => {
      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        documentNumber: undefined,
      };

      const result = buildCrossValidationComparison(
        baseExtractedData,
        eventData,
        'high',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber['isMatch']).toBe(false);
    });

    it('should handle missing documentNumber in extracted data', () => {
      const extractedData = {
        ...baseExtractedData,
        documentNumber: undefined,
      } as unknown as MtrExtractedData;

      const result = buildCrossValidationComparison(
        extractedData,
        baseEventData,
        'high',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber['confidence']).toBeNull();
      expect(documentNumber['extracted']).toBeNull();
      expect(documentNumber['isMatch']).toBe(false);
    });
  });

  describe('buildCdfCrossValidationComparison', () => {
    const baseCdfExtractedData: CdfExtractedData = {
      documentNumber: {
        confidence: 'high',
        parsed: 'CDF-001',
        rawMatch: 'CDF-001',
      },
      documentType: 'recyclingManifest',
      generator: stubEntityWithAddress(
        'Generator Co',
        '11.111.111/0001-11',
        'Rua Test',
        'Sao Paulo',
        'SP',
      ),
      issueDate: {
        confidence: 'high',
        parsed: '2024-01-01',
        rawMatch: '01/01/2024',
      },
      recycler: stubEntity('Recycler Corp', '33.333.333/0001-33'),
    } as unknown as CdfExtractedData;

    const baseCdfEventData: CdfCrossValidationEventData = {
      attachment: undefined,
      documentCurrentValue: 0,
      documentNumber: 'CDF-001',
      documentType: 'CDF',
      dropOffEvent: undefined,
      eventAddressId: 'addr-1',
      eventValue: 100,
      exemptionJustification: undefined,
      hasWrongLabelAttachment: false,
      issueDateAttribute: undefined,
      manifestType: 'cdf',
      mtrDocumentNumbers: [],
      pickUpEvent: undefined,
      recyclerCountryCode: 'BR',
      recyclerEvent: undefined,
      wasteGeneratorEvent: undefined,
      weighingEvents: [],
    };

    it('should return crossValidation object and log it', () => {
      const extractedDataWithEntries: CdfExtractedData = {
        ...baseCdfExtractedData,
        wasteEntries: {
          confidence: 'high',
          parsed: [
            {
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 1000,
              unit: 'kg',
            },
          ],
          rawMatch: '190812-Lodos',
        },
      } as unknown as CdfExtractedData;

      const result = buildCdfCrossValidationComparison(
        extractedDataWithEntries,
        baseCdfEventData,
        'high',
      );

      expect(result).toBeDefined();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          crossValidation: expect.objectContaining({
            documentNumber: expect.objectContaining({
              confidence: 'high',
              isMatch: true,
            }),
            mtrNumbers: expect.objectContaining({
              eventMtrNumbers: [],
            }),
          }),
          extractionConfidence: 'high',
        }),
        'Cross-validation field comparison (CDF)',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber).toHaveProperty('event', 'CDF-001');
      expect(documentNumber).toHaveProperty('extracted', 'CDF-001');
    });

    it('should always include values in the returned object', () => {
      const eventData: CdfCrossValidationEventData = {
        ...baseCdfEventData,
        recyclerEvent: {
          participant: { name: 'Recycler Corp', taxId: '33.333.333/0001-33' },
        } as unknown as DocumentEvent,
        wasteGeneratorEvent: {
          participant: {
            name: 'Generator Co',
            taxId: '11.111.111/0001-11',
          },
        } as unknown as DocumentEvent,
      };

      const result = buildCdfCrossValidationComparison(
        baseCdfExtractedData,
        eventData,
        'high',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber).toHaveProperty('event', 'CDF-001');
      expect(documentNumber).toHaveProperty('extracted', 'CDF-001');
    });

    it('should handle null fallbacks with minimal CDF event data', () => {
      const extractedData: CdfExtractedData = {
        ...baseCdfExtractedData,
        wasteEntries: {
          confidence: 'high',
          parsed: [{ description: 'Lodos de tratamento' }],
          rawMatch: 'Lodos',
        },
      } as unknown as CdfExtractedData;

      const eventData: CdfCrossValidationEventData = {
        ...baseCdfEventData,
        documentNumber: undefined,
      };

      const result = buildCdfCrossValidationComparison(
        extractedData,
        eventData,
        'high',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber).toHaveProperty('event', null);

      const wasteType = result['wasteType'] as Record<string, unknown>;
      const entries = wasteType['entries'] as Array<Record<string, unknown>>;

      expect(entries[0]).toHaveProperty('extracted', 'Lodos de tratamento');
    });

    it('should include processing period and MTR numbers', () => {
      const extractedData: CdfExtractedData = {
        ...baseCdfExtractedData,
        processingPeriod: {
          confidence: 'high',
          parsed: '01/01/2024 ate 31/01/2024',
          rawMatch: '01/01/2024 ate 31/01/2024',
        },
        transportManifests: {
          confidence: 'high',
          parsed: ['MTR-001', 'MTR-002'],
          rawMatch: 'MTR-001, MTR-002',
        },
      } as unknown as CdfExtractedData;

      const eventData: CdfCrossValidationEventData = {
        ...baseCdfEventData,
        dropOffEvent: {
          externalCreatedAt: '2024-01-15',
        } as unknown as DocumentEvent,
        mtrDocumentNumbers: ['MTR-001'],
      };

      const result = buildCdfCrossValidationComparison(
        extractedData,
        eventData,
        'high',
      );

      expect(result['mtrNumbers']).toEqual({
        eventMtrNumbers: ['MTR-001'],
        extractedManifests: ['MTR-001', 'MTR-002'],
      });

      const period = result['processingPeriod'] as Record<string, unknown>;

      expect(period['confidence']).toBe('high');
      expect(period['dropOffDate']).toBe('2024-01-15');
      expect(period['start']).toBe('01/01/2024');
      expect(period['end']).toBe('31/01/2024');
    });

    it('should include waste type and quantity with full event data', () => {
      const extractedData: CdfExtractedData = {
        ...baseCdfExtractedData,
        wasteEntries: {
          confidence: 'high',
          parsed: [
            {
              code: '190812',
              description: 'Lodos de tratamento',
              quantity: 1000,
              unit: 'kg',
            },
          ],
          rawMatch: '190812-Lodos',
        },
      } as unknown as CdfExtractedData;

      const eventData: CdfCrossValidationEventData = {
        ...baseCdfEventData,
        pickUpEvent: {
          metadata: {
            attributes: [
              {
                isPublic: true,
                name: 'Local Waste Classification ID',
                value: '190812',
              },
              {
                isPublic: true,
                name: 'Local Waste Classification Description',
                value: 'Lodos de tratamento',
              },
            ],
          },
        } as unknown as DocumentEvent,
        weighingEvents: [{ value: 1000 } as unknown as DocumentEvent],
      };

      const result = buildCdfCrossValidationComparison(
        extractedData,
        eventData,
        'high',
      );

      const wasteType = result['wasteType'] as Record<string, unknown>;

      expect(wasteType['confidence']).toBe('high');
      expect(wasteType['eventCode']).toBe('190812');

      const entries = wasteType['entries'] as Array<Record<string, unknown>>;

      expect(entries[0]?.['isMatch']).toBe(true);

      const quantityWeight = result['wasteQuantityWeight'] as Record<
        string,
        unknown
      >;

      expect(quantityWeight['normalizedKg']).toBe(1000);
      expect(quantityWeight['weighingValue']).toBe(1000);
    });

    it('should return null for issueDate fields when issueDate is not extracted', () => {
      const extractedData = {
        ...baseCdfExtractedData,
        issueDate: undefined,
      } as unknown as CdfExtractedData;

      const result = buildCdfCrossValidationComparison(
        extractedData,
        baseCdfEventData,
        'high',
      );

      const issueDate = result['issueDate'] as Record<string, unknown>;

      expect(issueDate['confidence']).toBeNull();
      expect(issueDate['extracted']).toBeNull();
      expect(issueDate['event']).toBeNull();
    });

    it('should return null for documentNumber fields when documentNumber is not extracted', () => {
      const extractedData = {
        ...baseCdfExtractedData,
        documentNumber: undefined,
      } as unknown as CdfExtractedData;

      const result = buildCdfCrossValidationComparison(
        extractedData,
        baseCdfEventData,
        'high',
      );

      const documentNumber = result['documentNumber'] as Record<
        string,
        unknown
      >;

      expect(documentNumber['confidence']).toBeNull();
      expect(documentNumber['extracted']).toBeNull();
    });

    it('should return null for cdfTotalWeight when wasteEntries are absent', () => {
      const result = buildCdfCrossValidationComparison(
        baseCdfExtractedData,
        baseCdfEventData,
        'high',
      );

      expect(result['cdfTotalWeight']).toBeNull();
    });

    it('should include layoutConfig in crossValidation output', () => {
      const layoutValidationConfig = {
        unsupportedFields: ['transportManifests'],
        unsupportedValidations: ['wasteType'],
      };

      const result = buildCdfCrossValidationComparison(
        baseCdfExtractedData,
        baseCdfEventData,
        'high',
        layoutValidationConfig,
      );

      expect(result['layoutConfig']).toEqual(layoutValidationConfig);
    });

    it('should include empty layoutConfig when no config provided', () => {
      const result = buildCdfCrossValidationComparison(
        baseCdfExtractedData,
        baseCdfEventData,
        'high',
      );

      expect(result['layoutConfig']).toEqual({});
    });

    it('should return cdfTotalWeight with null extractedTotalKg when all entries are volumetric', () => {
      const extractedData: CdfExtractedData = {
        ...baseCdfExtractedData,
        wasteEntries: {
          confidence: 'high',
          parsed: [{ description: 'Lodos', quantity: 5, unit: 'm³' }],
          rawMatch: 'Lodos',
        },
      } as unknown as CdfExtractedData;

      const result = buildCdfCrossValidationComparison(
        extractedData,
        baseCdfEventData,
        'high',
      );

      const cdfTotalWeight = result['cdfTotalWeight'] as Record<
        string,
        unknown
      >;

      expect(cdfTotalWeight['extractedTotalKg']).toBeNull();
      expect(cdfTotalWeight['isValid']).toBeNull();
    });
  });
});
