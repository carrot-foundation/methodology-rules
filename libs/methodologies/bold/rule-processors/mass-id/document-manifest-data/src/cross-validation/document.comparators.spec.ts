import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';

import { compareMtrNumbers, comparePeriod } from './document.comparators';

const notExtractedReason: ReviewReason = {
  code: 'NOT_EXTRACTED',
  description: 'Field not extracted',
};

const onPeriodMismatch = ({
  dropOffDate,
  periodEnd,
  periodStart,
}: {
  dropOffDate: string;
  periodEnd: string;
  periodStart: string;
}): ReviewReason => ({
  code: 'PERIOD_MISMATCH',
  description: `${dropOffDate} not in ${periodStart} - ${periodEnd}`,
});

const onMtrMismatch = ({ mtrNumber }: { mtrNumber: string }): ReviewReason => ({
  code: 'MTR_NOT_FOUND',
  description: `MTR ${mtrNumber} not found`,
});

describe('cross-validation document comparators', () => {
  describe('comparePeriod', () => {
    it('should return match when event date falls within period', () => {
      const result = comparePeriod(
        {
          confidence: 'high',
          parsed: '01/01/2024 ate 31/01/2024',
          rawMatch: '01/01/2024 ate 31/01/2024',
        },
        '2024-01-15T12:00:00Z',
        { onMismatch: onPeriodMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.debug.start).toBe('01/01/2024');
      expect(result.debug.end).toBe('31/01/2024');
      expect(result.validation).toEqual([]);
    });

    it('should return failReason when event date is outside period and confidence is high', () => {
      const result = comparePeriod(
        {
          confidence: 'high',
          parsed: '01/01/2024 ate 31/01/2024',
          rawMatch: '01/01/2024 ate 31/01/2024',
        },
        '2024-03-15T12:00:00Z',
        { onMismatch: onPeriodMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason?.code).toBe('PERIOD_MISMATCH');
    });

    it('should return reviewReason when event date is outside period and confidence is low', () => {
      const result = comparePeriod(
        {
          confidence: 'low',
          parsed: '01/01/2024 ate 31/01/2024',
          rawMatch: '01/01/2024 ate 31/01/2024',
        },
        '2024-03-15T12:00:00Z',
        { onMismatch: onPeriodMismatch },
      );

      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('PERIOD_MISMATCH');
    });

    it('should return null isMatch when period field is missing', () => {
      const result = comparePeriod(undefined, '2024-01-15T12:00:00Z', {
        notExtractedReason,
        onMismatch: onPeriodMismatch,
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return empty validation when event date is missing', () => {
      const result = comparePeriod(
        {
          confidence: 'high',
          parsed: '01/01/2024 ate 31/01/2024',
          rawMatch: '01/01/2024 ate 31/01/2024',
        },
        undefined,
        { onMismatch: onPeriodMismatch },
      );

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should return notExtractedReason when period cannot be parsed', () => {
      const result = comparePeriod(
        {
          confidence: 'high',
          parsed: 'invalid period string',
          rawMatch: 'invalid period string',
        },
        '2024-01-15T12:00:00Z',
        { notExtractedReason, onMismatch: onPeriodMismatch },
      );

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return empty validation when period cannot be parsed and no notExtractedReason', () => {
      const result = comparePeriod(
        {
          confidence: 'high',
          parsed: 'invalid period string',
          rawMatch: 'invalid period string',
        },
        '2024-01-15T12:00:00Z',
        { onMismatch: onPeriodMismatch },
      );

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should handle "a" separator in period string', () => {
      const result = comparePeriod(
        {
          confidence: 'high',
          parsed: '01/06/2024 a 30/06/2024',
          rawMatch: '01/06/2024 a 30/06/2024',
        },
        '2024-06-15T12:00:00Z',
        { onMismatch: onPeriodMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });
  });

  describe('compareMtrNumbers', () => {
    it('should return match when all event MTR numbers are found', () => {
      const result = compareMtrNumbers(
        { confidence: 'high', parsed: ['MTR-001', 'MTR-002'] },
        ['MTR-001', 'MTR-002'],
        { onMismatch: onMtrMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should return reviewReason for each missing MTR number', () => {
      const result = compareMtrNumbers(
        { confidence: 'high', parsed: ['MTR-001'] },
        ['MTR-001', 'MTR-003'],
        { onMismatch: onMtrMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('MTR_NOT_FOUND');
    });

    it('should use bidirectional substring matching', () => {
      const result = compareMtrNumbers(
        { confidence: 'high', parsed: ['MTR-001-FULL'] },
        ['MTR-001'],
        { onMismatch: onMtrMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should match when extracted is substring of event', () => {
      const result = compareMtrNumbers(
        { confidence: 'high', parsed: ['001'] },
        ['MTR-001'],
        { onMismatch: onMtrMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should return null isMatch when extracted is undefined', () => {
      const result = compareMtrNumbers(undefined, ['MTR-001'], {
        notExtractedReason,
        onMismatch: onMtrMismatch,
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.debug.extracted).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should skip validation when skipValidation is true', () => {
      const result = compareMtrNumbers(
        { confidence: 'high', parsed: ['MTR-001'] },
        ['MTR-003'],
        { onMismatch: onMtrMismatch, skipValidation: true },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toEqual([]);
    });

    it('should return empty validation when event MTR numbers is empty', () => {
      const result = compareMtrNumbers(
        { confidence: 'high', parsed: ['MTR-001'] },
        [],
        { onMismatch: onMtrMismatch },
      );

      expect(result.validation).toEqual([]);
    });

    it('should not emit notExtractedReason when event MTR numbers is empty', () => {
      const result = compareMtrNumbers(undefined, [], {
        notExtractedReason,
        onMismatch: onMtrMismatch,
      });

      expect(result.validation).toEqual([]);
    });
  });
});
