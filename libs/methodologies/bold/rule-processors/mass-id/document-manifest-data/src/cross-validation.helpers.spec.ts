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

const addressCommentFunction = ({
  score,
}: {
  eventAddress: string;
  extractedAddress: string;
  score: number;
}) => `Address mismatch: ${(score * 100).toFixed(0)}%`;

const dateCommentFunction = ({
  daysDiff,
  eventDate,
  extractedDate,
}: {
  daysDiff: number;
  eventDate: string;
  extractedDate: string;
}) => `Date differs by ${daysDiff} days: ${extractedDate} vs ${eventDate}`;

const periodCommentFunction = ({
  dropOffDate,
  periodEnd,
  periodStart,
}: {
  dropOffDate: string;
  periodEnd: string;
  periodStart: string;
}) => `Date ${dropOffDate} outside period ${periodStart}-${periodEnd}`;

const nameCommentFunction = () => 'Name mismatch';

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

  describe('validateEntityAddress', () => {
    it('should return empty when addresses match', () => {
      const entity = makeEntity('Rua das Flores 123', 'Sao Paulo', 'SP');
      const address = makeAddress('Rua das Flores', '123', 'Sao Paulo', 'SP');

      const result = validateEntityAddress(
        entity,
        address,
        addressCommentFunction,
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
        addressCommentFunction,
      );

      expect(result.reviewReason).toContain('Address mismatch');
    });

    it('should skip when extractedEntity is undefined', () => {
      const address = makeAddress('Rua Test', '1', 'City', 'ST');

      const result = validateEntityAddress(
        undefined,
        address,
        addressCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when eventAddress is undefined', () => {
      const entity = makeEntity('Rua Test', 'City', 'ST');

      const result = validateEntityAddress(
        entity,
        undefined,
        addressCommentFunction,
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
        addressCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when entity not extracted but event address exists and notExtractedComment provided', () => {
      const address = makeAddress('Rua Test', '1', 'City', 'ST');

      const result = validateEntityAddress(
        undefined,
        address,
        addressCommentFunction,
        'Address not extracted',
      );

      expect(result).toEqual({ reviewReason: 'Address not extracted' });
    });

    it('should return empty when entity not extracted, event address undefined, and notExtractedComment provided', () => {
      const result = validateEntityAddress(
        undefined,
        undefined,
        addressCommentFunction,
        'Address not extracted',
      );

      expect(result).toEqual({});
    });
  });

  describe('validateEntityName', () => {
    it('should return reviewReason when entity not extracted but event name exists and notExtractedComment provided', () => {
      const result = validateEntityName(
        undefined,
        'Some Company',
        nameCommentFunction,
        'Name not extracted',
      );

      expect(result).toEqual({ reviewReason: 'Name not extracted' });
    });

    it('should return empty when entity not extracted and event name is undefined', () => {
      const result = validateEntityName(
        undefined,
        undefined,
        nameCommentFunction,
        'Name not extracted',
      );

      expect(result).toEqual({});
    });

    it('should return empty when entity not extracted and no notExtractedComment', () => {
      const result = validateEntityName(
        undefined,
        'Some Company',
        nameCommentFunction,
      );

      expect(result).toEqual({});
    });
  });

  describe('validateEntityTaxId', () => {
    it('should return reviewReason when entity not extracted but event taxId exists and notExtractedComment provided', () => {
      const result = validateEntityTaxId(
        undefined,
        '12.345.678/0001-90',
        'Tax ID mismatch',
        'Tax ID not extracted',
      );

      expect(result).toEqual({ reviewReason: 'Tax ID not extracted' });
    });

    it('should return empty when entity not extracted and event taxId is undefined', () => {
      const result = validateEntityTaxId(
        undefined,
        undefined,
        'Tax ID mismatch',
        'Tax ID not extracted',
      );

      expect(result).toEqual({});
    });

    it('should return empty when entity not extracted and no notExtractedComment', () => {
      const result = validateEntityTaxId(
        undefined,
        '12.345.678/0001-90',
        'Tax ID mismatch',
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
        dateCommentFunction,
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
        dateCommentFunction,
      );

      expect(result.reviewReason).toContain('Date differs by');
      expect(result.failMessage).toBeUndefined();
    });

    it('should return failMessage when beyond tolerance (>3 days)', () => {
      const field: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024',
      } as ExtractedField<string>;

      const result = validateDateField(
        field,
        '2024-01-10',
        dateCommentFunction,
      );

      expect(result.failMessage).toContain('Date differs by');
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
        dateCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when extractedDate is undefined', () => {
      const result = validateDateField(
        undefined,
        '2024-01-15',
        dateCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when eventDateString is undefined', () => {
      const field: ExtractedField<string> = {
        confidence: 'high',
        parsed: '2024-01-15',
      } as ExtractedField<string>;

      const result = validateDateField(field, undefined, dateCommentFunction);

      expect(result).toEqual({});
    });

    it('should return reviewReason when date not extracted but event date exists and notExtractedComment provided', () => {
      const result = validateDateField(
        undefined,
        '2024-01-15',
        dateCommentFunction,
        'Date not extracted',
      );

      expect(result).toEqual({ reviewReason: 'Date not extracted' });
    });

    it('should return empty when date not extracted, event date undefined, and notExtractedComment provided', () => {
      const result = validateDateField(
        undefined,
        undefined,
        dateCommentFunction,
        'Date not extracted',
      );

      expect(result).toEqual({});
    });

    it('should return empty when date not extracted and no notExtractedComment', () => {
      const result = validateDateField(
        undefined,
        '2024-01-15',
        dateCommentFunction,
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
        periodCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should return failMessage when date is before period (high confidence)', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/02/2024 ate 28/02/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodCommentFunction,
      );

      expect(result.failMessage).toContain('outside period');
    });

    it('should return failMessage when date is after period (high confidence)', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024 ate 31/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-03-01',
        period,
        periodCommentFunction,
      );

      expect(result.failMessage).toContain('outside period');
    });

    it('should return reviewReason when confidence is low', () => {
      const period: ExtractedField<string> = {
        confidence: 'low',
        parsed: '01/02/2024 ate 28/02/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodCommentFunction,
      );

      expect(result.reviewReason).toContain('outside period');
      expect(result.failMessage).toBeUndefined();
    });

    it('should skip when eventDateString is undefined', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '01/01/2024 ate 31/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        undefined,
        period,
        periodCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when periodField is undefined', () => {
      const result = validateDateWithinPeriod(
        '2024-01-15',
        undefined,
        periodCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should return reviewReason when period not extracted but event date exists and notExtractedComment provided', () => {
      const result = validateDateWithinPeriod(
        '2024-01-15',
        undefined,
        periodCommentFunction,
        'Period not extracted',
      );

      expect(result).toEqual({ reviewReason: 'Period not extracted' });
    });

    it('should return empty when period not extracted, event date undefined, and notExtractedComment provided', () => {
      const result = validateDateWithinPeriod(
        undefined,
        undefined,
        periodCommentFunction,
        'Period not extracted',
      );

      expect(result).toEqual({});
    });

    it('should return empty when period not extracted and no notExtractedComment', () => {
      const result = validateDateWithinPeriod(
        '2024-01-15',
        undefined,
        periodCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should skip when period format is invalid', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: 'invalid period',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodCommentFunction,
      );

      expect(result).toEqual({});
    });

    it('should return empty when date is on the start boundary', () => {
      const period: ExtractedField<string> = {
        confidence: 'high',
        parsed: '15/01/2024 ate 31/01/2024',
      } as ExtractedField<string>;

      const result = validateDateWithinPeriod(
        '2024-01-15',
        period,
        periodCommentFunction,
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
        periodCommentFunction,
      );

      expect(result).toEqual({});
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
