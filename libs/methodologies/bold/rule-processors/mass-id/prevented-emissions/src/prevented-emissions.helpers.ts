import { isNil, isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  BoldAttributeName,
  BoldBaseline,
  type BoldDocumentEvent,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';

import {
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON,
  type StaticFactorSubtype,
} from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import { isWasteGeneratorBaselineValues } from './prevented-emissions.validators';

const { BASELINES } = BoldAttributeName;

export const getStaticPreventedEmissionsFactor = (
  wasteSubtype: StaticFactorSubtype,
  baseline: BoldBaseline,
  processorErrors: PreventedEmissionsProcessorErrors,
): number => {
  // The processor narrows `wasteSubtype` with a cast, so the static table's
  // declared type hides that this lookup can miss at runtime; treat the bucket
  // as possibly-undefined so the guard below is real.
  const factorsByBaseline =
    PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[wasteSubtype] as
      | Record<BoldBaseline, number>
      | undefined;
  const factor = factorsByBaseline?.[baseline];

  if (isNil(factor)) {
    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
    );
  }

  return factor;
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
