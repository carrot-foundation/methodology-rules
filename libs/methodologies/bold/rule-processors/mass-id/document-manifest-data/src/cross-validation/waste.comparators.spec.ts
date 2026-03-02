import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';
import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import { compareWasteQuantity, compareWasteType } from './waste.comparators';

const notExtractedReason: ReviewReason = {
  code: 'NOT_EXTRACTED',
  description: 'Field not extracted',
};

const onWasteMismatch = ({
  eventClassification,
  extractedEntries,
}: {
  eventClassification: string;
  extractedEntries: string;
}): ReviewReason => ({
  code: 'WASTE_TYPE_MISMATCH',
  description: `${extractedEntries} vs ${eventClassification}`,
});

const onQuantityMismatch = ({
  extractedQuantityKg,
  weighingWeight,
}: {
  extractedQuantityKg: string;
  weighingWeight: string;
}): ReviewReason => ({
  code: 'WEIGHT_BELOW_WEIGHING',
  description: `Extracted ${extractedQuantityKg} kg < weighing ${weighingWeight} kg`,
});

const matchingWasteEntry: WasteTypeEntryData = {
  code: '01 01 01',
  description: 'Residuos de papel',
};

describe('cross-validation waste comparators', () => {
  describe('compareWasteType', () => {
    it('should return match when entries contain a matching entry', () => {
      const result = compareWasteType(
        [matchingWasteEntry],
        '01 01 01',
        'Residuos de papel',
        { onMismatch: onWasteMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should return reviewReason when entries do not match', () => {
      const result = compareWasteType(
        [{ code: '02 02 02', description: 'Residuos de plastico' }],
        '01 01 01',
        'Residuos de papel',
        { onMismatch: onWasteMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe(
        'WASTE_TYPE_MISMATCH',
      );
    });

    it('should return notExtractedReason when no entries provided', () => {
      const result = compareWasteType(undefined, '01 01 01', 'Residuos', {
        notExtractedReason,
        onMismatch: onWasteMismatch,
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return empty validation when no event classification exists', () => {
      const result = compareWasteType(
        [matchingWasteEntry],
        undefined,
        undefined,
        { onMismatch: onWasteMismatch },
      );

      expect(result.validation).toEqual([]);
    });

    it('should skip validation when skipValidation is true', () => {
      const result = compareWasteType(
        [{ code: '02 02 02', description: 'Residuos de plastico' }],
        '01 01 01',
        'Residuos de papel',
        { onMismatch: onWasteMismatch, skipValidation: true },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toEqual([]);
    });

    it('should pass through confidence when provided', () => {
      const result = compareWasteType(
        [matchingWasteEntry],
        '01 01 01',
        'Residuos de papel',
        { confidence: 'high', onMismatch: onWasteMismatch },
      );

      expect(result.debug.confidence).toBe('high');
    });

    it('should return notExtractedReason when all entries are empty/meaningless', () => {
      const result = compareWasteType(
        [{ description: '' }],
        '01 01 01',
        'Residuos',
        { notExtractedReason, onMismatch: onWasteMismatch },
      );

      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should not emit notExtractedReason when entries are empty and no event', () => {
      const result = compareWasteType([], undefined, undefined, {
        notExtractedReason,
        onMismatch: onWasteMismatch,
      });

      expect(result.validation).toEqual([]);
    });

    it('should return empty validation when entries are meaningless and no notExtractedReason', () => {
      const result = compareWasteType(
        [{ description: '' }],
        '01 01 01',
        'Residuos',
        { onMismatch: onWasteMismatch },
      );

      expect(result.validation).toEqual([]);
    });

    it('should build event summary with empty description when eventCode exists but eventDescription is undefined', () => {
      const result = compareWasteType(
        [{ code: '02 02 02', description: 'Residuos de plastico' }],
        '01 01 01',
        undefined,
        { onMismatch: onWasteMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe(
        'WASTE_TYPE_MISMATCH',
      );
    });
  });

  describe('compareWasteQuantity', () => {
    describe('matched-entry strategy', () => {
      it('should return match when extracted weight >= weighing weight', () => {
        const entries: WasteTypeEntryData[] = [
          {
            code: '01 01 01',
            description: 'Papel',
            quantity: 200,
            unit: 'kg',
          },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 105 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug).not.toBeNull();
        expect(result.debug?.isMatch).toBe(true);
        expect(result.debug?.source).toBe('matched-entry');
        expect(result.validation).toEqual([]);
      });

      it('should return match when extracted weight equals weighing weight', () => {
        const entries: WasteTypeEntryData[] = [
          {
            code: '01 01 01',
            description: 'Papel',
            quantity: 100,
            unit: 'kg',
          },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 100 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.isMatch).toBe(true);
        expect(result.debug?.source).toBe('matched-entry');
        expect(result.validation).toEqual([]);
      });

      it('should return reviewReason when extracted weight is less than weighing weight', () => {
        const entries: WasteTypeEntryData[] = [
          {
            code: '01 01 01',
            description: 'Papel',
            quantity: 80,
            unit: 'kg',
          },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 100 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.isMatch).toBe(false);
        expect(result.debug?.source).toBe('matched-entry');
        expect(result.validation).toHaveLength(1);
        expect(result.validation[0]?.reviewReason?.code).toBe(
          'WEIGHT_BELOW_WEIGHING',
        );
      });

      it('should return null isMatch when no weighing events have value', () => {
        const entries: WasteTypeEntryData[] = [
          {
            code: '01 01 01',
            description: 'Papel',
            quantity: 100,
            unit: 'kg',
          },
        ];

        const result = compareWasteQuantity(entries, '01 01 01', 'Papel', [], {
          onMismatch: onQuantityMismatch,
        });

        expect(result.debug?.event).toBeNull();
        expect(result.debug?.isMatch).toBeNull();
        expect(result.debug?.source).toBe('matched-entry');
      });

      it('should handle ton unit conversion', () => {
        const entries: WasteTypeEntryData[] = [
          {
            code: '01 01 01',
            description: 'Papel',
            quantity: 1,
            unit: 'ton',
          },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 1000 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.extracted).toBe(1000);
        expect(result.debug?.isMatch).toBe(true);
        expect(result.debug?.source).toBe('matched-entry');
      });
    });

    describe('total-weight fallback strategy', () => {
      it('should fall back to total weight when no entry matches by waste type', () => {
        const entries: WasteTypeEntryData[] = [
          { description: 'Plastico', quantity: 500, unit: 'kg' },
          { description: 'Metal', quantity: 300, unit: 'kg' },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 700 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.source).toBe('total-weight');
        expect(result.debug?.extracted).toBe(800);
        expect(result.debug?.isMatch).toBe(true);
        expect(result.validation).toEqual([]);
      });

      it('should return mismatch when total weight is less than weighing', () => {
        const entries: WasteTypeEntryData[] = [
          { description: 'Plastico', quantity: 200, unit: 'kg' },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 500 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.source).toBe('total-weight');
        expect(result.debug?.isMatch).toBe(false);
        expect(result.validation).toHaveLength(1);
        expect(result.validation[0]?.reviewReason?.code).toBe(
          'WEIGHT_BELOW_WEIGHING',
        );
      });

      it('should fall back to total weight when matched entry has no quantity', () => {
        const entries: WasteTypeEntryData[] = [
          { code: '01 01 01', description: 'Papel' },
          { description: 'Other', quantity: 500, unit: 'kg' },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 400 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.source).toBe('total-weight');
        expect(result.debug?.extracted).toBe(500);
        expect(result.debug?.isMatch).toBe(true);
      });

      it('should return notExtractedReason when no entries have valid quantities', () => {
        const entries: WasteTypeEntryData[] = [
          { description: 'Plastico' },
          { description: 'Metal' },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 100 }],
          { notExtractedReason, onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.source).toBe('total-weight');
        expect(result.debug?.extracted).toBeNull();
        expect(result.validation).toHaveLength(1);
        expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
      });

      it('should handle mixed units in total weight calculation', () => {
        const entries: WasteTypeEntryData[] = [
          { description: 'Lodos A', quantity: 1, unit: 't' },
          { description: 'Lodos B', quantity: 500, unit: 'kg' },
        ];

        const result = compareWasteQuantity(
          entries,
          '99 99 99',
          'No match',
          [{ value: 1400 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug?.source).toBe('total-weight');
        expect(result.debug?.extracted).toBe(1500);
        expect(result.debug?.isMatch).toBe(true);
      });
    });

    describe('no entries', () => {
      it('should return null debug when no entries provided', () => {
        const result = compareWasteQuantity(
          undefined,
          '01 01 01',
          'Papel',
          [{ value: 100 }],
          { onMismatch: onQuantityMismatch },
        );

        expect(result.debug).toBeNull();
      });

      it('should return notExtractedReason when no entries and weighing exists', () => {
        const result = compareWasteQuantity(
          undefined,
          '01 01 01',
          'Papel',
          [{ value: 100 }],
          { notExtractedReason, onMismatch: onQuantityMismatch },
        );

        expect(result.debug).toBeNull();
        expect(result.validation).toHaveLength(1);
        expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
      });

      it('should not return notExtractedReason when no entries and no weighing', () => {
        const result = compareWasteQuantity(
          undefined,
          '01 01 01',
          'Papel',
          [],
          { notExtractedReason, onMismatch: onQuantityMismatch },
        );

        expect(result.debug).toBeNull();
        expect(result.validation).toEqual([]);
      });

      it('should return null debug for empty entries array', () => {
        const result = compareWasteQuantity([], '01 01 01', 'Papel', [], {
          onMismatch: onQuantityMismatch,
        });

        expect(result.debug).toBeNull();
        expect(result.validation).toEqual([]);
      });
    });

    describe('skipValidation', () => {
      it('should skip validation when skipValidation is true', () => {
        const entries: WasteTypeEntryData[] = [
          {
            code: '01 01 01',
            description: 'Papel',
            quantity: 80,
            unit: 'kg',
          },
        ];

        const result = compareWasteQuantity(
          entries,
          '01 01 01',
          'Papel',
          [{ value: 100 }],
          { onMismatch: onQuantityMismatch, skipValidation: true },
        );

        expect(result.debug?.isMatch).toBe(false);
        expect(result.validation).toEqual([]);
      });

      it('should skip notExtractedReason when skipValidation is true', () => {
        const result = compareWasteQuantity(
          undefined,
          '01 01 01',
          'Papel',
          [{ value: 100 }],
          {
            notExtractedReason,
            onMismatch: onQuantityMismatch,
            skipValidation: true,
          },
        );

        expect(result.validation).toEqual([]);
      });
    });
  });
});
