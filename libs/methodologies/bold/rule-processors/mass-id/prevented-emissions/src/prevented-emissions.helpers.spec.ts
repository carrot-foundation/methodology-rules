import {
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldRecyclingBaselinesEvent,
  stubDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  calculatePreventedEmissions,
  getGasTypeFromEvent,
  getPreventedEmissionsFactor,
  getWasteGeneratorBaselineByWasteSubtype,
  throwIfMissing,
} from './prevented-emissions.helpers';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT, GREENHOUSE_GAS_TYPE } =
  DocumentEventAttributeName;

describe('PreventedEmissionsHelpers', () => {
  const processorErrors = new PreventedEmissionsProcessorErrors();

  describe('getPreventedEmissionsFactor', () => {
    it('should return the correct prevented emissions factor for food waste and landfills without flaring', () => {
      const result = getPreventedEmissionsFactor(
        MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
        MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
      );

      expect(result).toBe(
        PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[
          MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES
        ][MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS],
      );
    });

    it('should return the correct prevented emissions factor for domestic sludge and open air dump', () => {
      const result = getPreventedEmissionsFactor(
        MassIdOrganicSubtype.DOMESTIC_SLUDGE,
        MethodologyBaseline.OPEN_AIR_DUMP,
      );

      expect(result).toBe(
        PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[
          MassIdOrganicSubtype.DOMESTIC_SLUDGE
        ][MethodologyBaseline.OPEN_AIR_DUMP],
      );
    });
  });

  describe('calculatePreventedEmissions', () => {
    it('should calculate prevented emissions correctly with positive values', () => {
      const exceedingEmissionCoefficient = 0.8;
      const preventedEmissionsByMaterialAndBaselinePerTon = 1500;
      const massIdDocumentValue = 100;

      const result = calculatePreventedEmissions(
        exceedingEmissionCoefficient,
        preventedEmissionsByMaterialAndBaselinePerTon,
        massIdDocumentValue,
      );

      expect(result).toBeCloseTo(30_000, 10); // Use toBeCloseTo for floating point
    });

    it('should calculate prevented emissions correctly with zero coefficient', () => {
      const exceedingEmissionCoefficient = 0;
      const preventedEmissionsByMaterialAndBaselinePerTon = 1000;
      const massIdDocumentValue = 50;

      const result = calculatePreventedEmissions(
        exceedingEmissionCoefficient,
        preventedEmissionsByMaterialAndBaselinePerTon,
        massIdDocumentValue,
      );

      expect(result).toBe(50_000); // (1 - 0) * 1000 * 50
    });

    it('should handle fractional values correctly', () => {
      const exceedingEmissionCoefficient = 0.25;
      const preventedEmissionsByMaterialAndBaselinePerTon = 800.5;
      const massIdDocumentValue = 10.5;

      const result = calculatePreventedEmissions(
        exceedingEmissionCoefficient,
        preventedEmissionsByMaterialAndBaselinePerTon,
        massIdDocumentValue,
      );

      expect(result).toBe(6303.9375); // (1 - 0.25) * 800.5 * 10.5
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
                  [MassIdOrganicSubtype.DOMESTIC_SLUDGE]:
                    MethodologyBaseline.OPEN_AIR_DUMP,
                  [MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]:
                    MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
                },
              ],
            ],
          }),
        ],
      });

      const result = getWasteGeneratorBaselineByWasteSubtype(
        document,
        MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
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
                  [MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]:
                    MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
                },
              ],
            ],
          }),
        ],
      });

      const result = getWasteGeneratorBaselineByWasteSubtype(
        document,
        MassIdOrganicSubtype.DOMESTIC_SLUDGE,
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
          MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
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
          MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
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
          MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
          processorErrors,
        ),
      ).toThrow(
        processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
      );
    });

    it('should throw an error when recycling baselines event is not found', () => {
      const document = stubDocument({
        externalEvents: [], // No events
      });

      expect(() =>
        getWasteGeneratorBaselineByWasteSubtype(
          document,
          MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
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
});
