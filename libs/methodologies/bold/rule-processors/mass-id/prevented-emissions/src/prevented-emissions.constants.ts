import {
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

/**
 * Read the file README.md for more information about the constants in this file.
 */
export const PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON: Record<
  MassIdOrganicSubtype,
  Record<MethodologyBaseline, number>
> = {
  [MassIdOrganicSubtype.DOMESTIC_SLUDGE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.066_584,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.227_18,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.155_804,
  },
  [MassIdOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.629_488,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.250_643,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.974_574,
  },
  [MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459_152,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.940_301,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.726_812,
  },
  [MassIdOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.499_788,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.120_943,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.844_874,
  },
  [MassIdOrganicSubtype.INDUSTRIAL_SLUDGE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.223_611,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.512_684,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.384_207,
  },
  [MassIdOrganicSubtype.TOBACCO]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459_152,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.940_301,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.726_812,
  },
  [MassIdOrganicSubtype.WOOD_AND_WOOD_PRODUCTS]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.720_371,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.415_883,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 1.106_767,
  },
};
