import {
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

/**
 * Read the file README.md for more information about the constants in this file.
 */
export const AVOIDED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON: Record<
  MassIdOrganicSubtype,
  Record<MethodologyBaseline, number>
> = {
  [MassIdOrganicSubtype.DOMESTIC_SLUDGE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.067,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.227,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.156,
  },
  [MassIdOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.629,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.25,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.974,
  },
  [MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.94,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.727,
  },
  [MassIdOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.499,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.121,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.844,
  },
  [MassIdOrganicSubtype.INDUSTRIAL_SLUDGE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.223,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.512,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.384,
  },
  [MassIdOrganicSubtype.TOBACCO]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.94,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.727,
  },
  [MassIdOrganicSubtype.WOOD_AND_WOOD_PRODUCTS]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.72,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.415,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 1.106,
  },
};
