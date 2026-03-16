import {
  DocumentEventAttributeName,
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyString } from '@carrot-fndn/shared/types';

import { type OthersIfOrganicCarbonEntry } from './prevented-emissions.types';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT } =
  DocumentEventAttributeName;

const formatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 3,
  roundingMode: 'floor',
  useGrouping: false,
});

export const formatNumber = (number_: number): string =>
  formatter.format(number_);

export const RESULT_COMMENTS = {
  failed: {
    MISSING_EXCEEDING_EMISSION_COEFFICIENT: `The "${EXCEEDING_EMISSION_COEFFICIENT}" attribute was not found in the "Recycler Accreditation" document or it is invalid.`,
    MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE: (
      wasteSubtype: MassIDOrganicSubtype,
    ) =>
      `The "${BASELINES}" was not found in the "Recycler Accreditation" document for the waste subtype "${wasteSubtype}" or it is invalid.`,
  },
  passed: {
    PASSED: (
      preventedEmissions: number,
      preventedEmissionsByWasteSubtypeAndBaselinePerTon: number,
      exceedingEmissionCoefficient: number,
      currentValue: number,
    ) =>
      `The prevented emissions were calculated as ${formatNumber(preventedEmissions)} kg CO₂e using the formula (${currentValue} x ${preventedEmissionsByWasteSubtypeAndBaselinePerTon}) - (${currentValue} x ${exceedingEmissionCoefficient}) = ${formatNumber(preventedEmissions)} [formula: (current_value x prevented_emissions_by_waste_subtype_and_baseline_per_ton) - (current_value x exceeding_emission_coefficient) = prevented_emissions].`,
  },
  reviewRequired: {},
} as const;

export const CDM_CODE_OTHERS_IF_ORGANIC = '8.7D';

/** Subtypes that use static factors. OTHERS_IF_ORGANIC is computed by formula. */
export type StaticFactorSubtype = Exclude<
  MassIDOrganicSubtype,
  MassIDOrganicSubtype.OTHERS_IF_ORGANIC
>;

/**
 * Read the file README.md for more information about the constants in this file.
 * OTHERS_IF_ORGANIC is excluded; its factor is computed via baseline-specific
 * linear formulas from carbon fraction per local waste classification code.
 */
export const PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON: Record<
  StaticFactorSubtype,
  Record<MethodologyBaseline, number>
> = {
  [MassIDOrganicSubtype.DOMESTIC_SLUDGE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.066_584,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.227_18,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.155_804,
  },
  [MassIDOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.629_488,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.250_643,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.974_574,
  },
  [MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459_152,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.940_301,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.726_812,
  },
  [MassIDOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.499_788,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.120_943,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.844_874,
  },
  [MassIDOrganicSubtype.INDUSTRIAL_SLUDGE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.223_611,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.512_684,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.384_207,
  },
  [MassIDOrganicSubtype.TOBACCO]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459_152,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.940_301,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.726_812,
  },
  [MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.720_371,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.415_883,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 1.106_767,
  },
};

export const OTHERS_IF_ORGANIC_BASELINE_FORMULA: Record<
  MethodologyBaseline,
  { intercept: string; slope: string }
> = {
  [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: {
    intercept: '-0.129701',
    slope: '3.795947',
  },
  [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: {
    intercept: '-0.1297003',
    slope: '6.901715',
  },
  [MethodologyBaseline.OPEN_AIR_DUMP]: {
    intercept: '-0.1297013',
    slope: '5.521373',
  },
};

export type OthersIfOrganicCarbonFractionsByCode = Record<
  NonEmptyString,
  OthersIfOrganicCarbonEntry
>;

/**
 * Carbon fractions per local waste classification code (Ibama, Brazil) for subtype
 * "Others (if organic)" (CDM 8.7D).
 *
 * Keys MUST be the canonical local waste classification code as it appears in
 * `WASTE_CLASSIFICATION_CODES.BR` (e.g. '02 01 06').
 */
export const OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE: OthersIfOrganicCarbonFractionsByCode =
  {
    /**
     * Local waste classification (Ibama, Brazil): 02 01 06
     * Carbon fraction: 15% -> 0.15
     */
    '02 01 06': {
      carbonFraction: '0.15',
    },
  };
