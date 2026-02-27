import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';
import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  compareCdfTotalWeight,
  compareWasteQuantity,
  compareWasteType,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './waste.comparators';

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
  discrepancyPercentage,
  extractedQuantity,
  unit,
  weighingWeight,
}: {
  discrepancyPercentage: string;
  extractedQuantity: string;
  unit: string;
  weighingWeight: string;
}): ReviewReason => ({
  code: 'WEIGHT_DISCREPANCY',
  description: `${extractedQuantity} ${unit} vs ${weighingWeight} kg (${discrepancyPercentage}%)`,
});

const cdfWeightMismatchReason = ({
  documentCurrentValue,
  extractedTotalKg,
}: {
  documentCurrentValue: number;
  extractedTotalKg: number;
}): ReviewReason => ({
  code: 'CDF_WEIGHT_EXCEEDS',
  description: `Document value ${documentCurrentValue} exceeds extracted ${extractedTotalKg}`,
});

const matchingWasteEntry: WasteTypeEntryData = {
  code: '01 01 01',
  description: 'Residuos de papel',
};

const baseCdfData = {
  documentType: 'recyclingManifest' as const,
  extractionConfidence: 'high' as const,
  lowConfidenceFields: [],
  rawText: 'test' as never,
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
    it('should return match when weights are within threshold', () => {
      const entries: WasteTypeEntryData[] = [
        { code: '01 01 01', description: 'Papel', quantity: 100, unit: 'kg' },
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
      expect(result.validation).toEqual([]);
    });

    it('should return reviewReason when discrepancy exceeds threshold', () => {
      const entries: WasteTypeEntryData[] = [
        { code: '01 01 01', description: 'Papel', quantity: 100, unit: 'kg' },
      ];

      const result = compareWasteQuantity(
        entries,
        '01 01 01',
        'Papel',
        [{ value: 200 }],
        { onMismatch: onQuantityMismatch },
      );

      expect(result.debug?.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe(
        'WEIGHT_DISCREPANCY',
      );
    });

    it('should return null debug when no entries provided', () => {
      const result = compareWasteQuantity(
        undefined,
        '01 01 01',
        'Papel',
        [{ value: 100 }],
        { onMismatch: onQuantityMismatch },
      );

      expect(result.debug).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should return null debug when no matched entry has quantity', () => {
      const entries: WasteTypeEntryData[] = [
        { code: '01 01 01', description: 'Papel' },
      ];

      const result = compareWasteQuantity(
        entries,
        '01 01 01',
        'Papel',
        [{ value: 100 }],
        { onMismatch: onQuantityMismatch },
      );

      expect(result.debug).toBeNull();
    });

    it('should return null debug when no weighing events have value', () => {
      const entries: WasteTypeEntryData[] = [
        { code: '01 01 01', description: 'Papel', quantity: 100, unit: 'kg' },
      ];

      const result = compareWasteQuantity(entries, '01 01 01', 'Papel', [], {
        onMismatch: onQuantityMismatch,
      });

      expect(result.debug?.event).toBeNull();
      expect(result.debug?.discrepancyPercentage).toBeNull();
    });

    it('should handle ton unit conversion', () => {
      const entries: WasteTypeEntryData[] = [
        { code: '01 01 01', description: 'Papel', quantity: 1, unit: 'ton' },
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
    });

    it('should export WEIGHT_DISCREPANCY_THRESHOLD as 0.1', () => {
      expect(WEIGHT_DISCREPANCY_THRESHOLD).toBe(0.1);
    });
  });

  describe('compareCdfTotalWeight', () => {
    it('should return null debug when wasteEntries is missing', () => {
      const extractedData = { ...baseCdfData } as CdfExtractedData;
      const result = compareCdfTotalWeight(extractedData, 100, {
        mismatchReason: cdfWeightMismatchReason,
      });

      expect(result.debug).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should return isMatch true when documentCurrentValue <= totalKg', () => {
      const extractedData = {
        ...baseCdfData,
        wasteEntries: {
          confidence: 'high' as const,
          parsed: [{ description: 'Papel', quantity: 150, unit: 'kg' }],
        },
      } as CdfExtractedData;

      const result = compareCdfTotalWeight(extractedData, 100, {
        mismatchReason: cdfWeightMismatchReason,
      });

      expect(result.debug?.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should return failReason when documentCurrentValue exceeds totalKg and confidence is high', () => {
      const extractedData = {
        ...baseCdfData,
        wasteEntries: {
          confidence: 'high' as const,
          parsed: [{ description: 'Papel', quantity: 50, unit: 'kg' }],
        },
      } as CdfExtractedData;

      const result = compareCdfTotalWeight(extractedData, 100, {
        mismatchReason: cdfWeightMismatchReason,
      });

      expect(result.debug?.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason?.code).toBe('CDF_WEIGHT_EXCEEDS');
    });

    it('should return reviewReason when documentCurrentValue exceeds totalKg and confidence is low', () => {
      const extractedData = {
        ...baseCdfData,
        wasteEntries: {
          confidence: 'low' as const,
          parsed: [{ description: 'Papel', quantity: 50, unit: 'kg' }],
        },
      } as CdfExtractedData;

      const result = compareCdfTotalWeight(extractedData, 100, {
        mismatchReason: cdfWeightMismatchReason,
      });

      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe(
        'CDF_WEIGHT_EXCEEDS',
      );
    });

    it('should use wasteEntriesConfidence override when provided', () => {
      const extractedData = {
        ...baseCdfData,
        wasteEntries: {
          confidence: 'high' as const,
          parsed: [{ description: 'Papel', quantity: 50, unit: 'kg' }],
        },
      } as CdfExtractedData;

      const result = compareCdfTotalWeight(extractedData, 100, {
        mismatchReason: cdfWeightMismatchReason,
        wasteEntriesConfidence: 'low',
      });

      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason).toBeDefined();
    });

    it('should return notExtractedReason when no valid quantities exist', () => {
      const extractedData = {
        ...baseCdfData,
        wasteEntries: {
          confidence: 'high' as const,
          parsed: [{ description: 'Papel' }],
        },
      } as CdfExtractedData;

      const result = compareCdfTotalWeight(extractedData, 100, {
        mismatchReason: cdfWeightMismatchReason,
        notExtractedReason,
      });

      expect(result.debug?.extracted).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return reviewReason when no valid quantities exist and confidence is low', () => {
      const extractedData = {
        ...baseCdfData,
        wasteEntries: {
          confidence: 'low' as const,
          parsed: [{ description: 'Papel' }],
        },
      } as CdfExtractedData;

      const result = compareCdfTotalWeight(extractedData, 100, {
        mismatchReason: cdfWeightMismatchReason,
        notExtractedReason,
      });

      expect(result.debug?.extracted).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });
  });
});
