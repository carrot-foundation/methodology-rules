import {
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const AVOIDED_EMISSIONS_BASELINE_MATRIX: Record<
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
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.251,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.975,
  },
  [MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.94,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.727,
  },
  [MassIdOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.5,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.121,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.845,
  },
  [MassIdOrganicSubtype.INDUSTRIAL_SLUDGE]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.224,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.513,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.384,
  },
  [MassIdOrganicSubtype.TOBACCO]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.459,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 0.94,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 0.727,
  },
  [MassIdOrganicSubtype.WOOD_AND_WOOD_PRODUCTS]: {
    [MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS]: 0.72,
    [MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS]: 1.416,
    [MethodologyBaseline.OPEN_AIR_DUMP]: 1.107,
  },
};
