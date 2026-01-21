import {
  isNil,
  isNonEmptyString,
  normalizeString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { WASTE_CLASSIFICATION_CODES } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/regional-waste-classification';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';

import {
  CDM_CODE_OTHERS_IF_ORGANIC,
  OTHERS_IF_ORGANIC_BASELINE_FORMULA,
  OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE,
  PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON,
} from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import { isWasteGeneratorBaselineValues } from './prevented-emissions.typia';

const { BASELINES } = DocumentEventAttributeName;
const { RECYCLING_BASELINES } = DocumentEventName;

const formatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 3,
  roundingMode: 'floor',
  useGrouping: false,
});

export interface OthersIfOrganicAuditDetails {
  canonicalLocalWasteClassificationCode: string;
  carbonFraction: number;
  computedFactor: number;
  formulaCoeffs: { intercept: number; slope: number };
}

export interface OthersIfOrganicContext {
  localWasteClassificationId?: string;
  normalizedLocalWasteClassificationId?: string;
}

export interface ResolvedLocalWasteClassificationIds {
  localWasteClassificationId?: string;
  normalizedLocalWasteClassificationId?: string;
}

export const resolveCanonicalLocalWasteClassificationId = (
  localWasteClassificationIdRaw: NonEmptyString | undefined,
): ResolvedLocalWasteClassificationIds => {
  const localWasteClassificationId = isNonEmptyString(
    localWasteClassificationIdRaw,
  )
    ? localWasteClassificationIdRaw
    : undefined;

  if (isNil(localWasteClassificationId)) {
    return {};
  }

  const validClassificationIds = Object.keys(WASTE_CLASSIFICATION_CODES.BR);
  const normalizedLocalWasteClassificationId = validClassificationIds.find(
    (validId) =>
      normalizeString(validId) === normalizeString(localWasteClassificationId),
  );

  return {
    ...(!isNil(localWasteClassificationId) && { localWasteClassificationId }),
    ...(!isNil(normalizedLocalWasteClassificationId) && {
      normalizedLocalWasteClassificationId,
    }),
  };
};

export const calculateOthersIfOrganicFactor = (
  baseline: MethodologyBaseline,
  carbonFraction: number,
): number => {
  const { intercept, slope } = OTHERS_IF_ORGANIC_BASELINE_FORMULA[baseline];

  return new BigNumber(slope)
    .multipliedBy(new BigNumber(carbonFraction.toString()))
    .plus(intercept)
    .decimalPlaces(6, BigNumber.ROUND_HALF_UP)
    .toNumber();
};

export const getPreventedEmissionsFactor = (
  wasteSubtype: MassIDOrganicSubtype,
  wasteGeneratorBaseline: MethodologyBaseline,
  processorErrors: PreventedEmissionsProcessorErrors,
  othersIfOrganicContext?: OthersIfOrganicContext,
): number => {
  if (wasteSubtype !== MassIDOrganicSubtype.OTHERS_IF_ORGANIC) {
    return PREVENTED_EMISSIONS_BY_WASTE_SUBTYPE_AND_BASELINE_PER_TON[
      wasteSubtype
    ][wasteGeneratorBaseline];
  }

  const { normalizedLocalWasteClassificationId } = othersIfOrganicContext ?? {};

  if (!isNonEmptyString(normalizedLocalWasteClassificationId)) {
    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID,
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      WASTE_CLASSIFICATION_CODES.BR,
      normalizedLocalWasteClassificationId,
    )
  ) {
    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID,
    );
  }

  const classificationEntry =
    WASTE_CLASSIFICATION_CODES.BR[
      normalizedLocalWasteClassificationId as keyof typeof WASTE_CLASSIFICATION_CODES.BR
    ];

  if (
    normalizeString(classificationEntry.CDM_CODE) !==
    normalizeString(CDM_CODE_OTHERS_IF_ORGANIC)
  ) {
    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.SUBTYPE_CDM_CODE_MISMATCH,
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE,
      normalizedLocalWasteClassificationId,
    )
  ) {
    throw processorErrors.getKnownError(
      `The carbon fraction for the "Others (if organic)" local waste classification code (Ibama, Brazil) "${normalizedLocalWasteClassificationId}" is not configured. Add it to OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE.`,
    );
  }

  const carbonEntry =
    OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE[
      normalizedLocalWasteClassificationId
    ];

  if (!carbonEntry) {
    throw processorErrors.getKnownError(
      `The carbon fraction for the "Others (if organic)" local waste classification code (Ibama, Brazil) "${normalizedLocalWasteClassificationId}" is not configured. Add it to OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE.`,
    );
  }

  return calculateOthersIfOrganicFactor(
    wasteGeneratorBaseline,
    carbonEntry.carbonFraction,
  );
};

export const getOthersIfOrganicAuditDetails = (
  normalizedLocalWasteClassificationId: string,
  baseline: MethodologyBaseline,
): OthersIfOrganicAuditDetails => {
  if (
    !Object.prototype.hasOwnProperty.call(
      OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE,
      normalizedLocalWasteClassificationId,
    )
  ) {
    throw new Error(
      `getOthersIfOrganicAuditDetails: no carbon entry for "${normalizedLocalWasteClassificationId}"`,
    );
  }

  const entry =
    OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE[
      normalizedLocalWasteClassificationId
    ];

  if (!entry) {
    throw new Error(
      `getOthersIfOrganicAuditDetails: no carbon entry for "${normalizedLocalWasteClassificationId}"`,
    );
  }

  const formulaCoeffsRaw = OTHERS_IF_ORGANIC_BASELINE_FORMULA[baseline];
  const formulaCoeffs = {
    intercept: Number.parseFloat(formulaCoeffsRaw.intercept),
    slope: Number.parseFloat(formulaCoeffsRaw.slope),
  };
  const computedFactor = calculateOthersIfOrganicFactor(
    baseline,
    entry.carbonFraction,
  );

  return {
    canonicalLocalWasteClassificationCode: normalizedLocalWasteClassificationId,
    carbonFraction: entry.carbonFraction,
    computedFactor,
    formulaCoeffs,
  };
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

export const getWasteGeneratorBaselineByWasteSubtype = (
  wasteGeneratorAccreditationDocument: Document,
  wasteSubtype: MassIDOrganicSubtype,
  processorErrors: PreventedEmissionsProcessorErrors,
): MethodologyBaseline | undefined => {
  const recyclingBaselineEvent =
    wasteGeneratorAccreditationDocument.externalEvents?.find(
      (event) => event.name === RECYCLING_BASELINES.toString(),
    );

  const baselines = getEventAttributeValue(recyclingBaselineEvent, BASELINES);

  if (!isWasteGeneratorBaselineValues(baselines)) {
    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
    );
  }

  return baselines[wasteSubtype];
};

export const throwIfMissing = <T>(
  value: T | undefined,
  errorMessage: string,
  processorErrors: PreventedEmissionsProcessorErrors,
): void => {
  if (isNil(value)) {
    throw processorErrors.getKnownError(errorMessage);
  }
};

export const getGasTypeFromEvent = (
  lastEmissionAndCompostingMetricsEvent: DocumentEvent | undefined,
): NonEmptyString => {
  const gasType = getEventAttributeValue(
    lastEmissionAndCompostingMetricsEvent,
    DocumentEventAttributeName.GREENHOUSE_GAS_TYPE,
  );

  if (!isNonEmptyString(gasType)) {
    const processorErrors = new PreventedEmissionsProcessorErrors();

    throw processorErrors.getKnownError(
      processorErrors.ERROR_MESSAGE.MISSING_GREENHOUSE_GAS_TYPE,
    );
  }

  return gasType;
};

export const formatNumber = (number_: number): string =>
  formatter.format(number_);
