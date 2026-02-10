import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import { logger } from '@carrot-fndn/shared/helpers';

import type { MtrCrossValidationEventData } from './document-manifest-data.helpers';

import { logCrossValidationComparison } from './cross-validation-debug.helpers';

const stubEntity = (name: string, taxId: string) => ({
  confidence: 'high' as const,
  parsed: { name, taxId },
  rawMatch: name,
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
};

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
        'Cross-validation field comparison',
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
});
