import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';
import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  compareCdfTotalWeight,
  compareDateField,
  compareEntity,
  compareMtrNumbers,
  comparePeriod,
  compareStringField,
  compareWasteQuantity,
  compareWasteType,
  DATE_TOLERANCE_DAYS,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './';
import {
  stubEntity,
  stubEntityWithAddress,
  stubMtrEntity,
  stubMtrEntityWithHighAddress,
} from './cross-validation.test-helpers';

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

const entityReasons = {
  name: {
    mismatchReason: ({ score }: { score: number }) => ({
      code: 'NAME_MISMATCH',
      description: `Name similarity: ${(score * 100).toFixed(0)}%`,
    }),
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

describe('cross-validation-comparators', () => {
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
        'Generator Co',
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
        'Different Name',
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
        'Generator Co',
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

    it('should return reviewReason when name mismatches with high confidence', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        'Completely Different Company Name XYZ',
        undefined,
        entityReasons,
      );

      const nameReview = result.validation.find(
        (v) => v.reviewReason?.code === 'NAME_MISMATCH',
      );

      if (result.debug?.isMatch === false) {
        expect(nameReview).toBeDefined();
        expect(nameReview?.reviewReason?.comparedFields?.[0]?.field).toBe(
          'name',
        );
      }
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
        'Completely Different Company Name XYZ',
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
        'Generator Co',
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
        'Generator Co',
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
        'Generator Co',
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
        'Generator Co',
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
        'Generator Co',
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
