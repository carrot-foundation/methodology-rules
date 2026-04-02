import { isNil, isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  BoldAttributeName,
  BoldBaseline,
  type BoldDocumentEvent,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';

import type { OthersIfOrganicContext } from './prevented-emissions.others-organic.helpers';

import { PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  calculateOthersIfOrganicFactor,
  getCarbonFractionForOthersIfOrganic,
} from './prevented-emissions.others-organic.helpers';
import { isWasteGeneratorBaselineValues } from './prevented-emissions.validators';

const { BASELINES } = BoldAttributeName;

export const getPreventedEmissionsFactor = (
  wasteSubtype: MassIDOrganicSubtype,
  baseline: BoldBaseline,
  processorErrors: PreventedEmissionsProcessorErrors,
  othersIfOrganicContext?: OthersIfOrganicContext,
): number => {
  if (wasteSubtype !== MassIDOrganicSubtype.OTHERS_IF_ORGANIC) {
    return PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[
      wasteSubtype
    ][baseline];
  }

  const carbonFraction = getCarbonFractionForOthersIfOrganic(
    othersIfOrganicContext,
    processorErrors,
  );

  return calculateOthersIfOrganicFactor(baseline, carbonFraction);
};

export const calculatePreventedEmissions = (
  exceedingEmissionCoefficient: number,
  preventedEmissionsByMaterialAndBaselinePerTon: number,
  massIDDocumentValue: number,
): number => {
  const computedValue =
    massIDDocumentValue * preventedEmissionsByMaterialAndBaselinePerTon -
    massIDDocumentValue * exceedingEmissionCoefficient;

  return Math.max(0, computedValue);
};

export const getBaselineByWasteSubtype = (
  emissionAndCompostingMetricsEvent: BoldDocumentEvent | undefined,
  wasteSubtype: MassIDOrganicSubtype,
  processorErrors: PreventedEmissionsProcessorErrors,
): BoldBaseline | undefined => {
  const baselines = getEventAttributeValue(
    emissionAndCompostingMetricsEvent,
    BASELINES,
  );

  if (!isWasteGeneratorBaselineValues(baselines)) {
    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.INVALID_BASELINES,
    );
  }

  return baselines[wasteSubtype];
};

export const throwIfMissing: <T>(
  value: null | T | undefined,
  errorMessage: string,
  processorErrors: PreventedEmissionsProcessorErrors,
) => asserts value is NonNullable<T> = <T>(
  value: null | T | undefined,
  errorMessage: string,
  processorErrors: PreventedEmissionsProcessorErrors,
): asserts value is NonNullable<T> => {
  if (isNil(value)) {
    throw processorErrors.getKnownError(errorMessage);
  }
};

export const getGasTypeFromEvent = (
  lastEmissionAndCompostingMetricsEvent: BoldDocumentEvent | undefined,
): NonEmptyString => {
  const gasType = getEventAttributeValue(
    lastEmissionAndCompostingMetricsEvent,
    BoldAttributeName.GREENHOUSE_GAS_TYPE,
  );

  if (!isNonEmptyString(gasType)) {
    const processorErrors = new PreventedEmissionsProcessorErrors();

    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
    );
  }

  return gasType;
};

// Re-export formatNumber from constants for backward compatibility
export { formatNumber } from './prevented-emissions.constants';
