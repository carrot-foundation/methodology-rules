import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import { logger } from '@carrot-fndn/shared/helpers';

import type { CdfCrossValidationEventData } from './recycling-manifest-cross-validation.helpers';
import type { MtrCrossValidationEventData } from './transport-manifest-cross-validation.helpers';

import {
  logCdfCrossValidationComparison,
  logCrossValidationComparison,
} from './cross-validation-debug.helpers';

const stubEntity = (name: string, taxId: string) => ({
  name: { confidence: 'high' as const, parsed: name, rawMatch: name },
  taxId: { confidence: 'high' as const, parsed: taxId, rawMatch: taxId },
});

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
  pickUpEvent: undefined,
  recyclerCountryCode: 'BR',
  recyclerEvent: undefined,
  wasteGeneratorEvent: undefined,
  weighingEvents: [],
};

const stubCdfEntity = (name: string, taxId: string) => ({
  name: { confidence: 'high' as const, parsed: name, rawMatch: name },
  taxId: { confidence: 'high' as const, parsed: taxId, rawMatch: taxId },
});

describe('cross-validation-debug.helpers', () => {
  const originalEnvironment = process.env;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnvironment;
    debugSpy.mockRestore();
  });

  describe('logCrossValidationComparison', () => {
    it('should log metadata without values when DEBUG is not set', () => {
      logCrossValidationComparison(baseExtractedData, baseEventData, 'high');

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

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['documentNumber']).not.toHaveProperty('event');
      expect(crossValidation['documentNumber']).not.toHaveProperty('extracted');
    });

    it('should include values when DEBUG=true', () => {
      process.env['DEBUG'] = 'true';

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

      logCrossValidationComparison(baseExtractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['documentNumber']).toHaveProperty(
        'event',
        '12345',
      );
      expect(crossValidation['documentNumber']).toHaveProperty(
        'extracted',
        '12345',
      );

      const generator = crossValidation['generator'] as Record<string, unknown>;

      expect(generator).toHaveProperty('extractedName', 'Generator Co');
      expect(generator).toHaveProperty('eventName', 'Generator Co');
      expect(generator).toHaveProperty('extractedTaxId', '11.111.111/0001-11');
      expect(generator).toHaveProperty('eventTaxId', '11.111.111/0001-11');
    });

    it('should handle null fallbacks when DEBUG=true with minimal event data', () => {
      process.env['DEBUG'] = 'true';

      const extractedData: MtrExtractedData = {
        ...baseExtractedData,
        wasteTypes: {
          confidence: 'high',
          parsed: [{ description: 'Lodos de tratamento' }],
          rawMatch: 'Lodos',
        },
      } as unknown as MtrExtractedData;

      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        documentNumber: undefined,
      };

      logCrossValidationComparison(extractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['documentNumber']).toHaveProperty('event', null);

      const generator = crossValidation['generator'] as Record<string, unknown>;

      expect(generator).toHaveProperty('eventName', null);
      expect(generator).toHaveProperty('eventTaxId', null);
      expect(generator).toHaveProperty('extractedName', 'Generator Co');

      expect(crossValidation['receivingDate']).toHaveProperty('event', null);
      expect(crossValidation['receivingDate']).toHaveProperty(
        'extracted',
        null,
      );
      expect(crossValidation['transportDate']).toHaveProperty('event', null);
      expect(crossValidation['transportDate']).toHaveProperty(
        'extracted',
        null,
      );
      expect(crossValidation['vehiclePlate']).toHaveProperty('event', null);
      expect(crossValidation['vehiclePlate']).toHaveProperty('extracted', null);

      const wasteType = crossValidation['wasteType'] as Record<string, unknown>;

      expect(wasteType).toHaveProperty('eventCode', null);
      expect(wasteType).toHaveProperty('eventDescription', null);

      const entries = wasteType['entries'] as Array<Record<string, unknown>>;

      expect(entries[0]).toHaveProperty('extracted', 'Lodos de tratamento');
    });

    it('should include all fields when DEBUG=true with full event data', () => {
      process.env['DEBUG'] = 'true';

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
        wasteTypes: {
          confidence: 'high',
          parsed: [{ code: '190812', description: 'Lodos de tratamento' }],
          rawMatch: '190812-Lodos',
        },
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

      logCrossValidationComparison(extractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['issueDate']).toHaveProperty('event', null);
      expect(crossValidation['issueDate']).toHaveProperty(
        'extracted',
        '2024-01-01',
      );
      expect(crossValidation['receivingDate']).toHaveProperty(
        'event',
        '2024-01-15',
      );
      expect(crossValidation['transportDate']).toHaveProperty(
        'event',
        '2024-01-10',
      );
      expect(crossValidation['vehiclePlate']).toHaveProperty(
        'event',
        'ABC1234',
      );
      expect(crossValidation['vehiclePlate']).toHaveProperty('isMatch', true);

      const wasteType = crossValidation['wasteType'] as Record<string, unknown>;
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

    it('should log entity similarity and taxId match metadata', () => {
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

      logCrossValidationComparison(baseExtractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      const receiver = crossValidation['receiver'] as Record<string, unknown>;

      expect(receiver['nameSimilarity']).toBe('100%');
      expect(receiver['taxIdMatch']).toBe(true);

      const generator = crossValidation['generator'] as Record<string, unknown>;

      expect(generator['taxIdMatch']).toBe(false);
      expect(generator['nameSimilarity']).not.toBe('100%');

      const hauler = crossValidation['hauler'] as Record<string, unknown>;

      expect(hauler['confidence']).toBe('high');
      expect(hauler['nameSimilarity']).toBeNull();
      expect(hauler['taxIdMatch']).toBeNull();
    });

    it('should handle missing document number in event data', () => {
      const eventData: MtrCrossValidationEventData = {
        ...baseEventData,
        documentNumber: undefined,
      };

      logCrossValidationComparison(baseExtractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['documentNumber']?.['isMatch']).toBe(false);
    });
  });

  describe('logCdfCrossValidationComparison', () => {
    const stubCdfEntityWithAddress = (
      name: string,
      taxId: string,
      address: string,
      city: string,
      state: string,
    ) => ({
      ...stubCdfEntity(name, taxId),
      address: {
        confidence: 'high' as const,
        parsed: address,
        rawMatch: address,
      },
      city: { confidence: 'high' as const, parsed: city, rawMatch: city },
      state: { confidence: 'high' as const, parsed: state, rawMatch: state },
    });

    const baseCdfExtractedData: CdfExtractedData = {
      documentNumber: {
        confidence: 'high',
        parsed: 'CDF-001',
        rawMatch: 'CDF-001',
      },
      documentType: 'recyclingManifest',
      generator: stubCdfEntityWithAddress(
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
      recycler: stubCdfEntity('Recycler Corp', '33.333.333/0001-33'),
    } as unknown as CdfExtractedData;

    const baseCdfEventData: CdfCrossValidationEventData = {
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

    it('should log CDF metadata without values when DEBUG is not set', () => {
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

      logCdfCrossValidationComparison(
        extractedDataWithEntries,
        baseCdfEventData,
        'high',
      );

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

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['documentNumber']).not.toHaveProperty('event');
      expect(crossValidation['documentNumber']).not.toHaveProperty('extracted');
    });

    it('should include values when DEBUG=true', () => {
      process.env['DEBUG'] = 'true';

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

      logCdfCrossValidationComparison(baseCdfExtractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['documentNumber']).toHaveProperty(
        'event',
        'CDF-001',
      );
      expect(crossValidation['documentNumber']).toHaveProperty(
        'extracted',
        'CDF-001',
      );
    });

    it('should handle null fallbacks when DEBUG=true with minimal CDF event data', () => {
      process.env['DEBUG'] = 'true';

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

      logCdfCrossValidationComparison(extractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['documentNumber']).toHaveProperty('event', null);

      const wasteType = crossValidation['wasteType'] as Record<string, unknown>;
      const entries = wasteType['entries'] as Array<Record<string, unknown>>;

      expect(entries[0]).toHaveProperty('extracted', 'Lodos de tratamento');
    });

    it('should log processing period and MTR numbers', () => {
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

      logCdfCrossValidationComparison(extractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      expect(crossValidation['mtrNumbers']).toEqual({
        eventMtrNumbers: ['MTR-001'],
        extractedManifests: ['MTR-001', 'MTR-002'],
      });

      const period = crossValidation['processingPeriod'] as Record<
        string,
        unknown
      >;

      expect(period['confidence']).toBe('high');
      expect(period['dropOffDate']).toBe('2024-01-15');
      expect(period['start']).toBe('01/01/2024');
      expect(period['end']).toBe('31/01/2024');
    });

    it('should log waste type and quantity with full event data', () => {
      process.env['DEBUG'] = 'true';

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
        dropOffEvent: {
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

      logCdfCrossValidationComparison(extractedData, eventData, 'high');

      const logged = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
      const crossValidation = logged['crossValidation'] as Record<
        string,
        Record<string, unknown>
      >;

      const wasteType = crossValidation['wasteType'] as Record<string, unknown>;

      expect(wasteType['confidence']).toBe('high');
      expect(wasteType['eventCode']).toBe('190812');

      const entries = wasteType['entries'] as Array<Record<string, unknown>>;

      expect(entries[0]?.['isMatch']).toBe(true);

      const quantityWeight = crossValidation['wasteQuantityWeight'] as Record<
        string,
        unknown
      >;

      expect(quantityWeight['normalizedKg']).toBe(1000);
      expect(quantityWeight['weighingValue']).toBe(1000);
    });
  });
});
