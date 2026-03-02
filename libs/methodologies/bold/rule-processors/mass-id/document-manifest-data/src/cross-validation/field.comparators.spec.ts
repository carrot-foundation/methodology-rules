import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';

import {
  stubEntity,
  stubEntityWithAddress,
  stubMtrEntity,
  stubMtrEntityWithHighAddress,
} from './cross-validation.stubs';
import {
  compareDateField,
  compareEntity,
  compareStringField,
  DATE_TOLERANCE_DAYS,
} from './field.comparators';

const mismatchReason = ({
  event,
  extracted,
}: {
  event: string;
  extracted: string;
}): ReviewReason => ({
  code: 'MISMATCH',
  description: `${extracted} vs ${event}`,
});

const notExtractedReason: ReviewReason = {
  code: 'NOT_EXTRACTED',
  description: 'Field not extracted',
};

const onDateMismatch = ({
  daysDiff,
  event,
  extracted,
}: {
  daysDiff: number;
  event: string;
  extracted: string;
}): ReviewReason => ({
  code: 'DATE_MISMATCH',
  description: `${extracted} vs ${event} (${daysDiff} days)`,
});

const entityReasons = {
  name: {
    notExtractedReason: {
      code: 'NAME_NOT_EXTRACTED',
      description: 'Name not extracted',
    },
  },
  taxId: {
    mismatchReason: () => ({
      code: 'TAXID_MISMATCH',
      description: 'Tax ID mismatch',
    }),
    notExtractedReason: {
      code: 'TAXID_NOT_EXTRACTED',
      description: 'Tax ID not extracted',
    },
  },
};

const entityReasonsWithAddress = {
  ...entityReasons,
  address: {
    mismatchReason: ({ score }: { score: number }) => ({
      code: 'ADDRESS_MISMATCH',
      description: `Address similarity: ${(score * 100).toFixed(0)}%`,
    }),
    notExtractedReason: {
      code: 'ADDRESS_NOT_EXTRACTED',
      description: 'Address not extracted',
    },
  },
};

const stubEventAddress = (
  overrides?: Partial<{
    city: string;
    countryState: string;
    number: string;
    street: string;
    zipCode: string;
  }>,
) => ({
  city: 'Sao Paulo',
  countryCode: 'BR',
  countryState: 'SP',
  id: '1',
  latitude: 0,
  longitude: 0,
  neighborhood: '',
  number: '123',
  participantId: '1',
  piiSnapshotId: '1',
  street: 'Rua ABC',
  zipCode: '00000-000',
  ...overrides,
});

describe('cross-validation field comparators', () => {
  describe('compareStringField', () => {
    it('should return match when values are equal', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        'ABC',
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.debug.confidence).toBe('high');
      expect(result.debug.extracted).toBe('ABC');
      expect(result.debug.event).toBe('ABC');
      expect(result.validation).toEqual([]);
    });

    it('should return failReason when routing is fail and values mismatch', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        'XYZ',
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason?.code).toBe('MISMATCH');
    });

    it('should return reviewReason with comparedFields when routing is review and values mismatch', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        'XYZ',
        { onMismatch: mismatchReason, routing: 'review' },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('MISMATCH');
      expect(result.validation[0]?.reviewReason?.comparedFields).toEqual([
        { event: 'XYZ', extracted: 'ABC', field: 'value' },
      ]);
    });

    it('should skip validation when confidence is low', () => {
      const result = compareStringField(
        { confidence: 'low', parsed: 'ABC', rawMatch: 'ABC' },
        'XYZ',
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toEqual([]);
    });

    it('should return null isMatch and not-extracted review when field is missing with notExtractedReason', () => {
      const result = compareStringField(undefined, 'ABC', {
        notExtractedReason,
        onMismatch: mismatchReason,
        routing: 'fail',
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.debug.extracted).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return no validation when field is missing and no notExtractedReason', () => {
      const result = compareStringField(undefined, 'ABC', {
        onMismatch: mismatchReason,
        routing: 'fail',
      });

      expect(result.validation).toEqual([]);
    });

    it('should return no validation when event value is missing', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        undefined,
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBeNull();
      expect(result.debug.event).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should use custom compareFn', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'abc-123', rawMatch: 'abc-123' },
        'ABC123',
        {
          compareFn: (a, b) =>
            a.replaceAll('-', '').toLowerCase() === b.toLowerCase(),
          onMismatch: mismatchReason,
          routing: 'review',
        },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should not emit notExtractedReason when field is missing and event is also missing', () => {
      const result = compareStringField(undefined, undefined, {
        notExtractedReason,
        onMismatch: mismatchReason,
        routing: 'fail',
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toEqual([]);
    });
  });

  describe('compareDateField', () => {
    it('should return match when dates are the same', () => {
      const result = compareDateField(
        { confidence: 'high', parsed: '2024-01-15', rawMatch: '15/01/2024' },
        '2024-01-15T00:00:00Z',
        { onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.debug.daysDiff).toBe(0);
      expect(result.validation).toEqual([]);
    });

    it('should return failReason when daysDiff exceeds tolerance', () => {
      const result = compareDateField(
        { confidence: 'high', parsed: '2024-01-01', rawMatch: '01/01/2024' },
        '2024-01-10T00:00:00Z',
        { onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason).toBeDefined();
      expect(result.validation[0]?.failReason?.code).toBe('DATE_MISMATCH');
      expect(
        result.validation[0]?.failReason?.comparedFields?.[0]?.similarity,
      ).toContain('days');
    });

    it('should return reviewReason when daysDiff is within tolerance', () => {
      const result = compareDateField(
        { confidence: 'high', parsed: '2024-01-01', rawMatch: '01/01/2024' },
        '2024-01-02T00:00:00Z',
        { onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason).toBeDefined();
    });

    it('should return failReason for any mismatch when tolerance is 0', () => {
      const result = compareDateField(
        { confidence: 'high', parsed: '2024-01-01', rawMatch: '01/01/2024' },
        '2024-01-02T00:00:00Z',
        { onMismatch: onDateMismatch, tolerance: 0 },
      );

      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason).toBeDefined();
    });

    it('should use default tolerance of DATE_TOLERANCE_DAYS', () => {
      const result = compareDateField(
        { confidence: 'high', parsed: '2024-01-01', rawMatch: '01/01/2024' },
        '2024-01-04T00:00:00Z',
        { onMismatch: onDateMismatch },
      );

      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason).toBeDefined();
      expect(DATE_TOLERANCE_DAYS).toBe(3);
    });

    it('should skip validation when confidence is low', () => {
      const result = compareDateField(
        { confidence: 'low', parsed: '2024-01-01', rawMatch: '01/01/2024' },
        '2024-02-01T00:00:00Z',
        { onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toEqual([]);
    });

    it('should return null isMatch when field is missing', () => {
      const result = compareDateField(undefined, '2024-01-01T00:00:00Z', {
        notExtractedReason,
        onMismatch: onDateMismatch,
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return empty validation when event date is missing', () => {
      const result = compareDateField(
        { confidence: 'high', parsed: '2024-01-01', rawMatch: '01/01/2024' },
        undefined,
        { onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toEqual([]);
    });
  });

  describe('compareEntity', () => {
    it('should return null debug and not-extracted reviews when entity is undefined', () => {
      const result = compareEntity(
        undefined,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug).toBeNull();
      expect(result.validation).toHaveLength(2);
      expect(result.validation[0]?.reviewReason?.code).toBe(
        'NAME_NOT_EXTRACTED',
      );
      expect(result.validation[1]?.reviewReason?.code).toBe(
        'TAXID_NOT_EXTRACTED',
      );
    });

    it('should not emit not-extracted when event values are also missing', () => {
      const result = compareEntity(
        undefined,
        undefined,
        undefined,
        entityReasons,
      );

      expect(result.debug).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should return isMatch true when taxId matches', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Different Name'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.debug?.taxIdMatch).toBe(true);
    });

    it('should return failReason when taxId mismatches with high confidence', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Generator Co'],
        '22.222.222/0001-22',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(false);
      expect(result.debug?.taxIdMatch).toBe(false);

      const taxIdFail = result.validation.find(
        (v) => v.failReason?.code === 'TAXID_MISMATCH',
      );

      expect(taxIdFail).toBeDefined();
      expect(taxIdFail?.failReason?.comparedFields?.[0]?.field).toBe('taxId');
    });

    it('should not produce name mismatch validation (name is informational only)', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Completely Different Company Name XYZ'],
        undefined,
        entityReasons,
      );

      const nameReview = result.validation.find(
        (v) => v.reviewReason?.code === 'NAME_MISMATCH',
      );

      expect(nameReview).toBeUndefined();
      expect(result.debug?.nameSimilarity).toBeDefined();
    });

    it('should match if businessName matches but registered name does not', () => {
      const entity = stubEntity(
        'CONCESSIONARIA DO BLOCO SUL S.A.',
        '11.111.111/0001-11',
      );
      const result = compareEntity(
        entity,
        [
          'Aeroporto Internacional Afonso Pena',
          'CONCESSIONARIA DO BLOCO SUL S.A.',
        ],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should use best score from multiple names', () => {
      const entity = stubEntity('Generator Company Ltd', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Completely Wrong Name', 'Generator Company Ltd'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.debug?.nameSimilarity).toBe('100%');
    });

    it('should keep better score when first name matches best', () => {
      const entity = stubEntity('Generator Company Ltd', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Generator Company Ltd', 'Completely Wrong Name'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.debug?.nameSimilarity).toBe('100%');
    });

    it('should skip name validation when confidence is low', () => {
      const entity = {
        name: { confidence: 'low' as const, parsed: 'Gen Co', rawMatch: '' },
        taxId: {
          confidence: 'low' as const,
          parsed: '11.111.111/0001-11',
          rawMatch: '',
        },
      };
      const result = compareEntity(
        entity,
        ['Completely Different Company Name XYZ'],
        '99.999.999/0001-99',
        entityReasons,
      );

      expect(result.validation).toEqual([]);
    });

    it('should include address in debug for entity with address fields', () => {
      const entity = stubEntityWithAddress(
        'Generator Co',
        '11.111.111/0001-11',
        'Rua ABC, 123',
        'Sao Paulo',
        'SP',
      );

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress(),
      );

      expect(result.debug?.address).toBeDefined();
      expect(result.debug?.address?.extracted).toContain('Sao Paulo');
    });

    it('should produce address review when address mismatches with high confidence', () => {
      const entity = stubMtrEntityWithHighAddress(
        'Generator Co',
        '11.111.111/0001-11',
        'Rua Completely Different',
        'Rio de Janeiro',
        'RJ',
      );

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress({
          city: 'Curitiba',
          countryState: 'PR',
          number: '456',
          street: 'Av Brasil',
          zipCode: '80000-000',
        }),
      );

      const addressReview = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_MISMATCH',
      );

      expect(addressReview).toBeDefined();
    });

    it('should not produce address validation when entity has no address fields', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress(),
      );

      expect(result.debug?.address).toBeUndefined();
      const addressReview = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_MISMATCH',
      );

      expect(addressReview).toBeUndefined();
    });

    it('should skip address validation when address confidence is low', () => {
      const entity = stubMtrEntity('Generator Co', '11.111.111/0001-11');

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress({
          city: 'Curitiba',
          countryState: 'PR',
          number: '456',
          street: 'Av Brasil',
          zipCode: '80000-000',
        }),
      );

      const addressReview = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_MISMATCH',
      );

      expect(addressReview).toBeUndefined();
    });

    it('should include address not-extracted review when entity undefined and address present', () => {
      const result = compareEntity(
        undefined,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress(),
      );

      expect(result.validation).toHaveLength(3);
      const addressNotExtracted = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_NOT_EXTRACTED',
      );

      expect(addressNotExtracted).toBeDefined();
    });
  });
});
