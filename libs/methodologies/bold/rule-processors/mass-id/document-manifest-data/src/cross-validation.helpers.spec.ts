import type {
  BaseExtractedData,
  ExtractedEntityWithAddressInfo,
  ExtractedField,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import type { MethodologyAddress } from '@carrot-fndn/shared/types';

import type { DocumentManifestEventSubject } from './document-manifest-data.helpers';

import {
  DATE_TOLERANCE_DAYS,
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  parsePeriodRange,
  routeByConfidence,
  validateBasicExtractedData,
  validateDateField,
  validateDateWithinPeriod,
  validateEntityAddress,
  validateEntityName,
  validateEntityTaxId,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './cross-validation.helpers';

const makeEntity = (
  address: string,
  city: string,
  state: string,
  confidence: 'high' | 'low' = 'high',
): ExtractedEntityWithAddressInfo =>
  ({
    address: { confidence, parsed: address },
    city: { confidence, parsed: city },
    name: { confidence: 'high', parsed: 'Test Entity' },
    state: { confidence, parsed: state },
    taxId: { confidence: 'high', parsed: '12345678000190' },
  }) as unknown as ExtractedEntityWithAddressInfo;

const makeAddress = (
  street: string,
  number: string,
  city: string,
  countryState: string,
): MethodologyAddress =>
  ({
    city,
    countryState,
    number,
    street,
  }) as unknown as MethodologyAddress;

const addressReviewReasonFunction = ({ score }: { score: number }) => ({
  code: 'ADDRESS_MISMATCH',
  description: `Address mismatch: ${(score * 100).toFixed(0)}%`,
});

const dateReviewReasonFunction = ({
  daysDiff,
  eventDate,
  extractedDate,
}: {
  daysDiff: number;
  eventDate: string;
  extractedDate: string;
}) => ({
  code: 'DATE_MISMATCH',
  description: `Date differs by ${daysDiff} days: ${extractedDate} vs ${eventDate}`,
});

const periodReviewReasonFunction = ({
  dropOffDate,
  periodEnd,
  periodStart,
}: {
  dropOffDate: string;
  periodEnd: string;
  periodStart: string;
}) => ({
  code: 'DATE_OUTSIDE_PERIOD',
  description: `Date ${dropOffDate} outside period ${periodStart}-${periodEnd}`,
});

const nameReviewReasonFunction = ({ score }: { score: number }) => ({
  code: 'NAME_MISMATCH',
  description: `Name mismatch: ${(score * 100).toFixed(0)}%`,
});

const taxIdReviewReasonFunction = () => ({
  code: 'TAX_ID_MISMATCH',
  description: 'Tax ID mismatch',
});

const notExtractedReviewReason = {
  code: 'FIELD_NOT_EXTRACTED',
  description: 'Field not extracted',
};

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

    it('should add review reason when document number is not extracted but event has one', () => {
      const extractionResult = {
        data: {
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

      expect(result.reviewReasons).toHaveLength(1);
      expect(result.reviewReasons[0]?.code).toBe('FIELD_NOT_EXTRACTED');
      expect(result.reviewReasons[0]?.description).toContain('document number');
    });

    it('should add review reason when issue date is not extracted but event has one', () => {
      const extractionResult = {
        data: {
          extractionConfidence: 'high',
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: undefined,
        issueDateAttribute: { name: 'issueDate', value: '2024-01-01' },
      } as DocumentManifestEventSubject;

      const result = validateBasicExtractedData(extractionResult, eventSubject);

      expect(result.reviewReasons).toHaveLength(1);
      expect(result.reviewReasons[0]?.code).toBe('FIELD_NOT_EXTRACTED');
      expect(result.reviewReasons[0]?.description).toContain('issue date');
    });

    it('should not flag issue date mismatch when event UTC datetime is same local date as extracted', () => {
      // 2024-01-15T02:30:00.000Z = Jan 15 UTC, but Jan 14 23:30 in Brazil (UTC-3)
      // Without timezone fix: UTC date "2024-01-15" vs extracted "2024-01-14" = 1 day diff → false failure
      // With timezone fix: local date "2024-01-14" matches extracted "2024-01-14" → no failure
      const extractionResult = {
        data: {
          extractionConfidence: 'high',
          issueDate: {
            confidence: 'high',
            parsed: '2024-01-14',
          },
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: undefined,
        issueDateAttribute: {
          name: 'issueDate',
          value: '2024-01-15T02:30:00.000Z',
        },
        recyclerCountryCode: 'BR',
      } as DocumentManifestEventSubject;

      const result = validateBasicExtractedData(extractionResult, eventSubject);

      expect(result.failMessages).toHaveLength(0);
      expect(result.reviewReasons).toHaveLength(0);
    });

    it('should not add review reasons when extracted fields are present', () => {
      const extractionResult = {
        data: {
          documentNumber: { confidence: 'high', parsed: '12345' },
          extractionConfidence: 'high',
          issueDate: { confidence: 'high', parsed: '2024-01-01' },
        },
        reviewReasons: [],
        reviewRequired: false,
      } as unknown as ExtractionOutput<BaseExtractedData>;

      const eventSubject: DocumentManifestEventSubject = {
        documentNumber: '12345',
        issueDateAttribute: { name: 'issueDate', value: '2024-01-01' },
      } as DocumentManifestEventSubject;

      const result = validateBasicExtractedData(extractionResult, eventSubject);

      expect(result.reviewReasons).toHaveLength(0);
    });
  });

  describe('validateEntityAddress', () => {
    it('should return empty when addresses match', () => {
      const entity = makeEntity('Rua das Flores 123', 'Sao Paulo', 'SP');
      const address = makeAddress('Rua das Flores', '123', 'Sao Paulo', 'SP');

      const result = validateEntityAddress(
        entity,
        address,
        addressReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when addresses do not match', () => {
      const entity = makeEntity(
        'Rua Completamente Diferente 999',
        'Rio de Janeiro',
        'RJ',
      );
      const address = makeAddress('Av Brasil', '100', 'Curitiba', 'PR');

      const result = validateEntityAddress(
        entity,
        address,
        addressReviewReasonFunction,
      );

      expect(result.reviewReason).toBeDefined();
      expect(result.reviewReason?.code).toBe('ADDRESS_MISMATCH');
      expect(result.reviewReason?.description).toContain('Address mismatch');
      expect(result.reviewReason?.comparedFields).toEqual([
        expect.objectContaining({
          event: 'Av Brasil, 100, Curitiba, PR',
          extracted: 'Rua Completamente Diferente 999, Rio de Janeiro, RJ',
          field: 'address',
          similarity: expect.stringContaining('%'),
        }),
      ]);
    });

    it('should skip when extractedEntity is undefined', () => {
      const address = makeAddress('Rua Test', '1', 'City', 'ST');

      const result = validateEntityAddress(
        undefined,
        address,
        addressReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when eventAddress is undefined', () => {
      const entity = makeEntity('Rua Test', 'City', 'ST');

      const result = validateEntityAddress(
        entity,
        undefined,
        addressReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when address confidence is low', () => {
      const entity = makeEntity(
        'Completely Different Address',
        'Different City',
        'XX',
        'low',
      );
      const address = makeAddress('Rua Test', '1', 'City', 'ST');

      const result = validateEntityAddress(
        entity,
        address,
        addressReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when entity not extracted but event address exists and notExtractedReviewReason provided', () => {
      const address = makeAddress('Rua Test', '1', 'City', 'ST');

      const result = validateEntityAddress(
        undefined,
        address,
        addressReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({
        reviewReason: notExtractedReviewReason,
      });
    });

    it('should return empty when entity not extracted, event address undefined, and notExtractedReviewReason provided', () => {
      const result = validateEntityAddress(
        undefined,
        undefined,
        addressReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({});
    });
  });

  describe('validateEntityName', () => {
    it('should return reviewReason when entity not extracted but event name exists and notExtractedReviewReason provided', () => {
      const result = validateEntityName(
        undefined,
        'Some Company',
        nameReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({
        reviewReason: notExtractedReviewReason,
      });
    });

    it('should return empty when entity not extracted and event name is undefined', () => {
      const result = validateEntityName(
        undefined,
        undefined,
        nameReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({});
    });

    it('should return empty when entity not extracted and no notExtractedReviewReason', () => {
      const result = validateEntityName(
        undefined,
        'Some Company',
        nameReviewReasonFunction,
      );

      expect(result).toEqual({});
    });
  });

  describe('validateEntityTaxId', () => {
    it('should return reviewReason when entity not extracted but event taxId exists and notExtractedReviewReason provided', () => {
      const result = validateEntityTaxId(
        undefined,
        '12.345.678/0001-90',
        taxIdReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({
        reviewReason: notExtractedReviewReason,
      });
    });

    it('should return empty when entity not extracted and event taxId is undefined', () => {
      const result = validateEntityTaxId(
        undefined,
        undefined,
        taxIdReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({});
    });

    it('should return empty when entity not extracted and no notExtractedReviewReason', () => {
      const result = validateEntityTaxId(
        undefined,
        '12.345.678/0001-90',
        taxIdReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return empty when taxId confidence is low (skips validation)', () => {
      const entity = {
        name: { confidence: 'high', parsed: 'Test Entity' },
        taxId: { confidence: 'low', parsed: '98765432000100' },
      } as unknown as ExtractedEntityWithAddressInfo;

      const result = validateEntityTaxId(
        entity,
        '12.345.678/0001-90',
        taxIdReviewReasonFunction,
      );

      expect(result).toEqual({});
    });
  });

  describe('validateDateField', () => {
    it('should return empty when dates match (same day)', () => {
      const field: ExtractedField<string> = {
        confidence: 'high',
        parsed: '2024-01-15',
      } as ExtractedField<string>;

      const result = validateDateField(
        field,
        '2024-01-15',
        dateReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when within tolerance (1-3 days)', () => {
      const field: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024',
      } as ExtractedField<string>;

      const result = validateDateField(
        field,
        '2024-01-03',
        dateReviewReasonFunction,
      );

      expect(result.reviewReason).toBeDefined();
      expect(result.reviewReason?.code).toBe('DATE_MISMATCH');
      expect(result.reviewReason?.description).toContain('Date differs by');
      expect(result.reviewReason?.comparedFields).toEqual([
        expect.objectContaining({
          event: '2024-01-03',
          extracted: '01/01/2024',
          field: 'date',
        }),
      ]);
      expect(result.failReason).toBeUndefined();
    });

    it('should return failReason when beyond tolerance (>3 days)', () => {
      const field: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024',
      } as ExtractedField<string>;

      const result = validateDateField(
        field,
        '2024-01-10',
        dateReviewReasonFunction,
      );

      expect(result.failReason).toBeDefined();
      expect(result.failReason?.code).toBe('DATE_MISMATCH');
      expect(result.failReason?.description).toContain('Date differs by');
      expect(result.failReason?.comparedFields).toEqual([
        expect.objectContaining({
          event: '2024-01-10',
          extracted: '01/01/2024',
          field: 'date',
        }),
      ]);
      expect(result.reviewReason).toBeUndefined();
    });

    it('should skip when confidence is not high', () => {
      const field: ExtractedField<string> = {
        confidence: 'low',
        parsed: '01/01/2024',
      } as ExtractedField<string>;

      const result = validateDateField(
        field,
        '2024-06-15',
        dateReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when extractedDate is undefined', () => {
      const result = validateDateField(
        undefined,
        '2024-01-15',
        dateReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when eventDateString is undefined', () => {
      const field: ExtractedField<string> = {
        confidence: 'high',
        parsed: '2024-01-15',
      } as ExtractedField<string>;

      const result = validateDateField(
        field,
        undefined,
        dateReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when date not extracted but event date exists and notExtractedReviewReason provided', () => {
      const result = validateDateField(
        undefined,
        '2024-01-15',
        dateReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({
        reviewReason: notExtractedReviewReason,
      });
    });

    it('should return empty when date not extracted, event date undefined, and notExtractedReviewReason provided', () => {
      const result = validateDateField(
        undefined,
        undefined,
        dateReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({});
    });

    it('should return empty when date not extracted and no notExtractedReviewReason', () => {
      const result = validateDateField(
        undefined,
        '2024-01-15',
        dateReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should pass when UTC datetime crosses midnight but matches extracted date in local timezone', () => {
      // 2024-11-01T02:45:00.000Z = 2024-10-31 in America/Sao_Paulo (UTC-3)
      const field: ExtractedField<string> = {
        confidence: 'high',
        parsed: '31/10/2024',
      } as ExtractedField<string>;

      const result = validateDateField(
        field,
        '2024-11-01T02:45:00.000Z',
        dateReviewReasonFunction,
        undefined,
        'America/Sao_Paulo',
      );

      expect(result).toEqual({});
    });
  });

  describe('matchWasteTypeEntry', () => {
    it('should match when code and description both match', () => {
      const result = matchWasteTypeEntry(
        { code: '190812', description: 'Lodos de tratamento' },
        '190812',
        'Lodos de tratamento',
      );

      expect(result.isMatch).toBe(true);
      expect(result.isCodeMatch).toBe(true);
    });

    it('should match by description only when no code on either side', () => {
      const result = matchWasteTypeEntry(
        { description: 'Plastico' },
        undefined,
        'Plastico',
      );

      expect(result.isMatch).toBe(true);
      expect(result.isCodeMatch).toBeNull();
    });

    it('should not match when codes differ', () => {
      const result = matchWasteTypeEntry(
        { code: '020101', description: 'Lodos' },
        '190812',
        'Lodos de tratamento',
      );

      expect(result.isMatch).toBe(false);
      expect(result.isCodeMatch).toBe(false);
    });

    it('should not match when no event description or code', () => {
      const result = matchWasteTypeEntry(
        { code: '190812', description: 'Lodos' },
        undefined,
        undefined,
      );

      expect(result.isMatch).toBe(false);
    });

    it('should normalize waste codes with spaces', () => {
      const result = matchWasteTypeEntry(
        { code: '19 08 12', description: 'Lodos de tratamento' },
        '190812',
        'Lodos de tratamento',
      );

      expect(result.isMatch).toBe(true);
      expect(result.isCodeMatch).toBe(true);
    });
  });

  describe('normalizeQuantityToKg', () => {
    it('should return quantity as-is when unit is undefined', () => {
      expect(normalizeQuantityToKg(100, undefined)).toBe(100);
    });

    it('should return quantity as-is when unit is kg', () => {
      expect(normalizeQuantityToKg(100, 'kg')).toBe(100);
    });

    it('should multiply by 1000 when unit is ton', () => {
      expect(normalizeQuantityToKg(2, 'ton')).toBe(2000);
    });

    it('should multiply by 1000 when unit is t', () => {
      expect(normalizeQuantityToKg(3, 't')).toBe(3000);
    });

    it('should return undefined for unknown units', () => {
      expect(normalizeQuantityToKg(5, 'm³')).toBeUndefined();
    });
  });

  describe('parsePeriodRange', () => {
    it('should parse "ate" separator', () => {
      const result = parsePeriodRange('01/01/2024 ate 31/01/2024');

      expect(result).toEqual({ end: '31/01/2024', start: '01/01/2024' });
    });

    it('should parse "a" separator', () => {
      const result = parsePeriodRange('01/02/2024 a 28/02/2024');

      expect(result).toEqual({ end: '28/02/2024', start: '01/02/2024' });
    });

    it('should return undefined for invalid format', () => {
      const result = parsePeriodRange('January 2024');

      expect(result).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      const result = parsePeriodRange('01/01/2024 ATE 31/01/2024');

      expect(result).toEqual({ end: '31/01/2024', start: '01/01/2024' });
    });
  });

  describe('validateDateWithinPeriod', () => {
    it('should return empty when date is within period', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024 ate 31/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return failReason when date is before period (high confidence)', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/02/2024 ate 28/02/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodReviewReasonFunction,
      );

      expect(result.failReason).toBeDefined();
      expect(result.failReason?.code).toBe('DATE_OUTSIDE_PERIOD');
      expect(result.failReason?.description).toContain('outside period');
      expect(result.failReason?.comparedFields).toEqual([
        expect.objectContaining({
          event: '2024-01-15',
          extracted: '01/02/2024 - 28/02/2024',
          field: 'dateWithinPeriod',
        }),
      ]);
    });

    it('should return failReason when date is after period (high confidence)', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024 ate 31/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-03-01',
        period,
        periodReviewReasonFunction,
      );

      expect(result.failReason).toBeDefined();
      expect(result.failReason?.description).toContain('outside period');
    });

    it('should return reviewReason when confidence is low', () => {
      const period: ExtractedField<string> = {
        confidence: 'low',
        parsed: '01/02/2024 ate 28/02/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodReviewReasonFunction,
      );

      expect(result.reviewReason).toBeDefined();
      expect(result.reviewReason?.code).toBe('DATE_OUTSIDE_PERIOD');
      expect(result.reviewReason?.description).toContain('outside period');
      expect(result.reviewReason?.comparedFields).toEqual([
        expect.objectContaining({
          event: '2024-01-15',
          extracted: '01/02/2024 - 28/02/2024',
          field: 'dateWithinPeriod',
        }),
      ]);
      expect(result.failReason).toBeUndefined();
    });

    it('should skip when eventDateString is undefined', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024 ate 31/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        undefined,
        period,
        periodReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when periodField is undefined', () => {
      const result = validateDateWithinPeriod(
        '2024-01-15',
        undefined,
        periodReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when period not extracted but event date exists and notExtractedReviewReason provided', () => {
      const result = validateDateWithinPeriod(
        '2024-01-15',
        undefined,
        periodReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({
        reviewReason: notExtractedReviewReason,
      });
    });

    it('should return empty when period not extracted, event date undefined, and notExtractedReviewReason provided', () => {
      const result = validateDateWithinPeriod(
        undefined,
        undefined,
        periodReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({});
    });

    it('should return empty when period not extracted and no notExtractedReviewReason', () => {
      const result = validateDateWithinPeriod(
        '2024-01-15',
        undefined,
        periodReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when period format is invalid and no notExtractedReviewReason', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: 'invalid period',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when period format is invalid and notExtractedReviewReason provided', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: 'invalid period',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodReviewReasonFunction,
        notExtractedReviewReason,
      );

      expect(result).toEqual({ reviewReason: notExtractedReviewReason });
    });

    it('should return empty when date is on the start boundary', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '15/01/2024 ate 31/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should return empty when date is on the end boundary', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024 ate 15/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodReviewReasonFunction,
      );

      expect(result).toEqual({});
    });

    it('should pass when UTC datetime crosses midnight but falls within period in local timezone', () => {
      // 2024-11-01T02:45:00.000Z = 2024-10-31 in America/Sao_Paulo (UTC-3)
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/10/2024 ate 31/10/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-11-01T02:45:00.000Z',
        period,
        periodReviewReasonFunction,
        undefined,
        'America/Sao_Paulo',
      );

      expect(result).toEqual({});
    });

    it('should fail when UTC datetime falls outside period even in local timezone', () => {
      // 2024-11-02T02:45:00.000Z = 2024-11-01 in America/Sao_Paulo — still outside October
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/10/2024 ate 31/10/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-11-02T02:45:00.000Z',
        period,
        periodReviewReasonFunction,
        undefined,
        'America/Sao_Paulo',
      );

      expect(result.failReason).toBeDefined();
    });
  });

  describe('routeByConfidence', () => {
    it('should return failReason when confidence is high', () => {
      const reviewReason = { code: 'TEST_CODE', description: 'Test message' };

      expect(routeByConfidence('high', reviewReason)).toEqual({
        failReason: reviewReason,
      });
    });

    it('should return reviewReason when confidence is not high', () => {
      const reviewReason = { code: 'TEST_CODE', description: 'Test message' };

      expect(routeByConfidence('low', reviewReason)).toEqual({
        reviewReason,
      });
    });
  });

  describe('constants', () => {
    it('should have DATE_TOLERANCE_DAYS as 3', () => {
      expect(DATE_TOLERANCE_DAYS).toBe(3);
    });

    it('should have WEIGHT_DISCREPANCY_THRESHOLD as 0.1', () => {
      expect(WEIGHT_DISCREPANCY_THRESHOLD).toBe(0.1);
    });
  });
});
