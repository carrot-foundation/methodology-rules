import {
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldRecyclingBaselinesEvent,
  stubDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_IBAMA_CODE,
  OthersIfOrganicCarbonFractionByCanonicalIbamaCode,
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON,
} from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  calculatePreventedEmissions,
  formatNumber,
  getGasTypeFromEvent,
  getOthersIfOrganicAuditDetails,
  getPreventedEmissionsFactor,
  getWasteGeneratorBaselineByWasteSubtype,
  resolveCanonicalIbamaId,
  throwIfMissing,
} from './prevented-emissions.helpers';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT, GREENHOUSE_GAS_TYPE } =
  DocumentEventAttributeName;

describe('PreventedEmissionsHelpers', () => {
  const processorErrors = new PreventedEmissionsProcessorErrors();

  describe('resolveCanonicalIbamaId', () => {
    it('should return empty ids when localWasteClassificationIdRaw is undefined', () => {
      expect(resolveCanonicalIbamaId(undefined)).toStrictEqual({});
    });
  });

  describe('getPreventedEmissionsFactor', () => {
    it('should return the correct prevented emissions factor for food waste and landfills without flaring', () => {
      const result = getPreventedEmissionsFactor(
        MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
        MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        processorErrors,
      );

      expect(result).toBe(
        PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[
          MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES
        ][MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS],
      );
    });

    it('should return the correct prevented emissions factor for domestic sludge and open air dump', () => {
      const result = getPreventedEmissionsFactor(
        MassIDOrganicSubtype.DOMESTIC_SLUDGE,
        MethodologyBaseline.OPEN_AIR_DUMP,
        processorErrors,
      );

      expect(result).toBe(
        PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[
          MassIDOrganicSubtype.DOMESTIC_SLUDGE
        ][MethodologyBaseline.OPEN_AIR_DUMP],
      );
    });

    it('should throw INVALID_CLASSIFICATION_ID for Others (if organic) when normalized IBAMA code is missing', () => {
      expect(() =>
        getPreventedEmissionsFactor(
          MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
          MethodologyBaseline.OPEN_AIR_DUMP,
          processorErrors,
          {},
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('should throw INVALID_CLASSIFICATION_ID for Others (if organic) when normalized IBAMA code is unknown', () => {
      expect(() =>
        getPreventedEmissionsFactor(
          MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
          MethodologyBaseline.OPEN_AIR_DUMP,
          processorErrors,
          { normalizedLocalWasteClassificationId: '00 00 00' },
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('should throw SUBTYPE_CDM_CODE_MISMATCH for Others (if organic) when IBAMA code is not 8.7D', () => {
      expect(() =>
        getPreventedEmissionsFactor(
          MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
          MethodologyBaseline.OPEN_AIR_DUMP,
          processorErrors,
          { normalizedLocalWasteClassificationId: '02 01 01' },
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.SUBTYPE_CDM_CODE_MISMATCH);
    });

    it('should throw when carbon entry exists but is undefined (defensive branch)', () => {
      const canonicalIbamaCode = '02 01 06';
      const carbonMap: OthersIfOrganicCarbonFractionByCanonicalIbamaCode =
        OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_IBAMA_CODE;
      const original = carbonMap[canonicalIbamaCode];

      try {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalIbamaCode] = undefined;

        expect(() =>
          getPreventedEmissionsFactor(
            MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
            MethodologyBaseline.OPEN_AIR_DUMP,
            processorErrors,
            { normalizedLocalWasteClassificationId: canonicalIbamaCode },
          ),
        ).toThrow(
          `The carbon fraction for the "Others (if organic)" IBAMA code "${canonicalIbamaCode}" is not configured. Add it to OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_IBAMA_CODE.`,
        );
      } finally {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalIbamaCode] = original;
      }
    });
  });

  describe('getOthersIfOrganicAuditDetails', () => {
    it('should throw when IBAMA code is not configured', () => {
      expect(() =>
        getOthersIfOrganicAuditDetails(
          '00 00 00',
          MethodologyBaseline.OPEN_AIR_DUMP,
        ),
      ).toThrow(
        'getOthersIfOrganicAuditDetails: no carbon entry for "00 00 00"',
      );
    });

    it('should throw when IBAMA code exists but entry is undefined (defensive branch)', () => {
      const canonicalIbamaCode = '02 01 06';
      const carbonMap =
        OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_IBAMA_CODE as OthersIfOrganicCarbonFractionByCanonicalIbamaCode;
      const original = carbonMap[canonicalIbamaCode];

      try {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalIbamaCode] = undefined;

        expect(() =>
          getOthersIfOrganicAuditDetails(
            canonicalIbamaCode,
            MethodologyBaseline.OPEN_AIR_DUMP,
          ),
        ).toThrow(
          `getOthersIfOrganicAuditDetails: no carbon entry for "${canonicalIbamaCode}"`,
        );
      } finally {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalIbamaCode] = original;
      }
    });

    it('should return audit details without sources', () => {
      expect(
        getOthersIfOrganicAuditDetails(
          '02 01 06',
          MethodologyBaseline.OPEN_AIR_DUMP,
        ),
      ).toEqual({
        canonicalIbamaCode: '02 01 06',
        carbonFraction: 0.15,
        computedFactor:
          Number.parseFloat('5.521373') * 0.15 - Number.parseFloat('0.1297013'),
        formulaCoeffs: {
          intercept: Number.parseFloat('-0.1297013'),
          slope: Number.parseFloat('5.521373'),
        },
      });
    });
  });

  describe('calculatePreventedEmissions', () => {
    it('should calculate prevented emissions correctly with positive values', () => {
      const exceedingEmissionCoefficient = 0.8;
      const preventedEmissionsByMaterialAndBaselinePerTon = 1500;
      const massIDDocumentValue = 100;

      const result = calculatePreventedEmissions(
        exceedingEmissionCoefficient,
        preventedEmissionsByMaterialAndBaselinePerTon,
        massIDDocumentValue,
      );

      expect(result).toBeCloseTo(149_920, 10);
    });

    it('should calculate prevented emissions correctly with zero coefficient', () => {
      const exceedingEmissionCoefficient = 0;
      const preventedEmissionsByMaterialAndBaselinePerTon = 1000;
      const massIDDocumentValue = 50;

      const result = calculatePreventedEmissions(
        exceedingEmissionCoefficient,
        preventedEmissionsByMaterialAndBaselinePerTon,
        massIDDocumentValue,
      );

      expect(result).toBe(50_000);
    });

    it('should handle fractional values correctly', () => {
      const exceedingEmissionCoefficient = 0.25;
      const preventedEmissionsByMaterialAndBaselinePerTon = 800.5;
      const massIDDocumentValue = 10.5;

      const result = calculatePreventedEmissions(
        exceedingEmissionCoefficient,
        preventedEmissionsByMaterialAndBaselinePerTon,
        massIDDocumentValue,
      );

      expect(result).toBe(8402.625);
    });

    it('should clamp to zero when exceedingEmissionCoefficient >= preventedEmissionsByMaterialAndBaselinePerTon', () => {
      const exceedingEmissionCoefficient = 2000;
      const preventedEmissionsByMaterialAndBaselinePerTon = 1500;
      const massIDDocumentValue = 100;

      const result = calculatePreventedEmissions(
        exceedingEmissionCoefficient,
        preventedEmissionsByMaterialAndBaselinePerTon,
        massIDDocumentValue,
      );

      expect(result).toBe(0);
    });
  });

  describe('getWasteGeneratorBaselineByWasteSubtype', () => {
    it('should return the baseline for the specified waste subtype', () => {
      const document = stubDocument({
        externalEvents: [
          stubBoldRecyclingBaselinesEvent({
            metadataAttributes: [
              [
                BASELINES,
                {
                  [MassIDOrganicSubtype.DOMESTIC_SLUDGE]:
                    MethodologyBaseline.OPEN_AIR_DUMP,
                  [MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]:
                    MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
                },
              ],
            ],
          }),
        ],
      });

      const result = getWasteGeneratorBaselineByWasteSubtype(
        document,
        MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
        processorErrors,
      );

      expect(result).toBe(
        MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
      );
    });

    it('should return undefined when baseline for waste subtype is not available', () => {
      const document = stubDocument({
        externalEvents: [
          stubBoldRecyclingBaselinesEvent({
            metadataAttributes: [
              [
                BASELINES,
                {
                  [MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]:
                    MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
                },
              ],
            ],
          }),
        ],
      });

      const result = getWasteGeneratorBaselineByWasteSubtype(
        document,
        MassIDOrganicSubtype.DOMESTIC_SLUDGE,
        processorErrors,
      );

      expect(result).toBeUndefined();
    });

    it('should throw an error when baselines are invalid', () => {
      const document = stubDocument({
        externalEvents: [
          stubBoldRecyclingBaselinesEvent({
            metadataAttributes: [[BASELINES, 'invalid_baselines']],
          }),
        ],
      });

      expect(() =>
        getWasteGeneratorBaselineByWasteSubtype(
          document,
          MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
          processorErrors,
        ),
      ).toThrow(
        processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
      );
    });

    it('should throw an error when baselines are null', () => {
      const document = stubDocument({
        externalEvents: [
          stubBoldRecyclingBaselinesEvent({
            metadataAttributes: [[BASELINES, null]],
          }),
        ],
      });

      expect(() =>
        getWasteGeneratorBaselineByWasteSubtype(
          document,
          MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
          processorErrors,
        ),
      ).toThrow(
        processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
      );
    });

    it('should throw an error when baselines are undefined', () => {
      const document = stubDocument({
        externalEvents: [
          stubBoldRecyclingBaselinesEvent({
            metadataAttributes: [[BASELINES, undefined]],
          }),
        ],
      });

      expect(() =>
        getWasteGeneratorBaselineByWasteSubtype(
          document,
          MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
          processorErrors,
        ),
      ).toThrow(
        processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
      );
    });

    it('should throw an error when recycling baselines event is not found', () => {
      const document = stubDocument({
        externalEvents: [],
      });

      expect(() =>
        getWasteGeneratorBaselineByWasteSubtype(
          document,
          MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
          processorErrors,
        ),
      ).toThrow(
        processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
      );
    });
  });

  describe('throwIfMissing', () => {
    const errorMessage = 'Test error message';

    it('should not throw when value is defined', () => {
      expect(() => {
        throwIfMissing('valid value', errorMessage, processorErrors);
      }).not.toThrow();
    });

    it('should not throw when value is 0', () => {
      expect(() => {
        throwIfMissing(0, errorMessage, processorErrors);
      }).not.toThrow();
    });

    it('should not throw when value is false', () => {
      expect(() => {
        throwIfMissing(false, errorMessage, processorErrors);
      }).not.toThrow();
    });

    it('should not throw when value is empty string', () => {
      expect(() => {
        throwIfMissing('', errorMessage, processorErrors);
      }).not.toThrow();
    });

    it('should throw when value is null', () => {
      expect(() => {
        throwIfMissing(null, errorMessage, processorErrors);
      }).toThrow(errorMessage);
    });

    it('should throw when value is undefined', () => {
      expect(() => {
        throwIfMissing(undefined, errorMessage, processorErrors);
      }).toThrow(errorMessage);
    });
  });

  describe('getGasTypeFromEvent', () => {
    it('should return the gas type when the attribute exists and is valid', () => {
      const event = stubBoldEmissionAndCompostingMetricsEvent({
        metadataAttributes: [
          [EXCEEDING_EMISSION_COEFFICIENT, 0.8],
          [GREENHOUSE_GAS_TYPE, 'Methane (CH4)'],
        ],
      });
      const result = getGasTypeFromEvent(event);

      expect(result).toBe('Methane (CH4)');
    });

    it('should throw an error when the gas type attribute is missing', () => {
      const event = stubBoldEmissionAndCompostingMetricsEvent({
        metadataAttributes: [[EXCEEDING_EMISSION_COEFFICIENT, 0.8]],
      });

      expect(() => getGasTypeFromEvent(event)).toThrow(
        processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
      );
    });

    it('should throw an error when the gas type attribute is empty', () => {
      const event = stubBoldEmissionAndCompostingMetricsEvent({
        metadataAttributes: [
          [EXCEEDING_EMISSION_COEFFICIENT, 0.8],
          [GREENHOUSE_GAS_TYPE, ''],
        ],
      });

      expect(() => getGasTypeFromEvent(event)).toThrow(
        processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
      );
    });

    it('should throw an error when the gas type attribute is null', () => {
      const event = stubBoldEmissionAndCompostingMetricsEvent({
        metadataAttributes: [
          [EXCEEDING_EMISSION_COEFFICIENT, 0.8],
          [GREENHOUSE_GAS_TYPE, null],
        ],
      });

      expect(() => getGasTypeFromEvent(event)).toThrow(
        processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
      );
    });

    it('should throw an error when the event is undefined', () => {
      expect(() => getGasTypeFromEvent(undefined)).toThrow(
        processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
      );
    });
  });

  describe('formatNumber', () => {
    it.each([
      {
        description:
          'should format number with floor rounding to 3 decimal places',
        expected: '43.915',
        input: 43.9159,
      },
      {
        description: 'should floor round down when 4th decimal is 9',
        expected: '1006.312',
        input: 1006.312_230_000_001,
      },
      {
        description: 'should handle exact 3 decimal places',
        expected: '123.456',
        input: 123.456,
      },
      {
        description: 'should pad with zeros if fewer than 3 decimals',
        expected: '42',
        input: 42,
      },
      {
        description: 'should handle very small numbers',
        expected: '0.001',
        input: 0.0019,
      },
      {
        description:
          'should floor to zero when result would be less than 0.001',
        expected: '0',
        input: 0.0009,
      },
      {
        description: 'should handle negative numbers with floor rounding',
        expected: '-43.916',
        input: -43.9159,
      },
      {
        description: 'should handle large numbers',
        expected: '12345.678',
        input: 12_345.6789,
      },
      {
        description: 'should handle zero',
        expected: '0',
        input: 0,
      },
      {
        description: 'should handle numbers with trailing zeros',
        expected: '123.45',
        input: 123.4501,
      },
      {
        description: 'should handle numbers already at 3 decimal precision',
        expected: '999.999',
        input: 999.9999,
      },
    ])('$description', ({ expected, input }) => {
      const result = formatNumber(input);

      expect(result).toBe(expected);
    });
  });
});
