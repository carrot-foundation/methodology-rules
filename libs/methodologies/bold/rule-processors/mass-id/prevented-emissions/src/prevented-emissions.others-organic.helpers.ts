import {
  isNil,
  isNonEmptyString,
  normalizeString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  BoldAttributeName,
  BoldBaseline,
  type BoldDocument,
  BoldDocumentEventName,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { WASTE_CLASSIFICATION_CODES } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type NonEmptyString,
  NonNegativeFloat,
  PercentageString,
  PercentageStringSchema,
} from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';
import { addYears, isAfter, isValid, parseISO } from 'date-fns';

import type {
  GeneratorCarbonCharacterization,
  OthersIfOrganicCarbonResolution,
  OthersIfOrganicRuleSubjectIds,
} from './prevented-emissions.types';

import {
  CDM_CODE_OTHERS_IF_ORGANIC,
  OTHERS_IF_ORGANIC_BASELINE_FORMULA,
  OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE,
} from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';

const {
  CARBON_ANALYSIS_DATE,
  CARBON_FRACTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  MOISTURE_FRACTION,
} = BoldAttributeName;
const { ORGANIC_WASTE_CARBON_CHARACTERIZATION, PICK_UP } =
  BoldDocumentEventName;

export interface OthersIfOrganicAuditDetails {
  canonicalLocalWasteClassificationCode: NonEmptyString;
  carbonFraction: PercentageString;
  computedFactor: NonNegativeFloat;
  formulaCoeffs: { intercept: number; slope: number };
}

export type OthersIfOrganicContext = OthersIfOrganicRuleSubjectIds;

export interface ResolvedLocalWasteClassificationIds {
  localWasteClassificationId?: NonEmptyString | undefined;
  normalizedLocalWasteClassificationId?: NonEmptyString | undefined;
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

export const getOthersIfOrganicContextFromMassIdDocument = (
  massIDDocument: BoldDocument,
): OthersIfOrganicContext => {
  if (massIDDocument.subtype !== MassIDOrganicSubtype.OTHERS_IF_ORGANIC) {
    return {};
  }

  const pickUpEvent = massIDDocument.externalEvents?.find(
    (event) => event.name === PICK_UP.toString(),
  );
  const localWasteClassificationIdRaw = getEventAttributeValue(
    pickUpEvent,
    LOCAL_WASTE_CLASSIFICATION_ID,
  );

  return resolveCanonicalLocalWasteClassificationId(
    isNonEmptyString(localWasteClassificationIdRaw)
      ? localWasteClassificationIdRaw
      : undefined,
  );
};

export const buildOthersIfOrganicContext = (
  ids: OthersIfOrganicRuleSubjectIds,
): OthersIfOrganicContext | undefined => {
  if (
    isNil(ids.localWasteClassificationId) &&
    isNil(ids.normalizedLocalWasteClassificationId)
  ) {
    return undefined;
  }

  return {
    ...(!isNil(ids.localWasteClassificationId) && {
      localWasteClassificationId: ids.localWasteClassificationId,
    }),
    ...(!isNil(ids.normalizedLocalWasteClassificationId) && {
      normalizedLocalWasteClassificationId:
        ids.normalizedLocalWasteClassificationId,
    }),
  };
};

export const calculateOthersIfOrganicFactor = (
  baseline: BoldBaseline,
  carbonFraction: PercentageString,
): NonNegativeFloat => {
  const { intercept, slope } = OTHERS_IF_ORGANIC_BASELINE_FORMULA[baseline];

  const computed = new BigNumber(slope)
    .multipliedBy(new BigNumber(carbonFraction))
    .plus(intercept)
    .decimalPlaces(6, BigNumber.ROUND_HALF_DOWN);

  return BigNumber.max(computed, 0).toNumber();
};

const toUtcStartOfDay = (isoDate: NonEmptyString): Date => {
  const parsed = parseISO(isoDate);

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
};

export const isCarbonCharacterizationValid = (
  analysisDate: NonEmptyString,
  pickUpDate: NonEmptyString,
): boolean =>
  !isAfter(
    toUtcStartOfDay(pickUpDate),
    addYears(toUtcStartOfDay(analysisDate), 2),
  );

export const getGeneratorCarbonCharacterization = (
  wasteGeneratorAccreditationDocument: BoldDocument | undefined,
  normalizedLocalWasteClassificationId: NonEmptyString | undefined,
): GeneratorCarbonCharacterization | undefined => {
  if (
    isNil(wasteGeneratorAccreditationDocument) ||
    !isNonEmptyString(normalizedLocalWasteClassificationId)
  ) {
    return undefined;
  }

  const candidates = (
    wasteGeneratorAccreditationDocument.externalEvents ?? []
  ).filter(
    (candidate) =>
      candidate.name === ORGANIC_WASTE_CARBON_CHARACTERIZATION.toString() &&
      normalizeString(
        String(
          getEventAttributeValue(candidate, LOCAL_WASTE_CLASSIFICATION_ID) ??
            '',
        ),
      ) === normalizeString(normalizedLocalWasteClassificationId),
  );

  let newest: GeneratorCarbonCharacterization | undefined;

  for (const candidate of candidates) {
    const carbonFractionRaw = getEventAttributeValue(
      candidate,
      CARBON_FRACTION,
    );
    const analysisDate = getEventAttributeValue(
      candidate,
      CARBON_ANALYSIS_DATE,
    );
    const moistureFractionRaw = getEventAttributeValue(
      candidate,
      MOISTURE_FRACTION,
    );

    if (
      !isNonEmptyString(carbonFractionRaw) ||
      !isNonEmptyString(analysisDate) ||
      !isNonEmptyString(moistureFractionRaw)
    ) {
      continue;
    }

    if (!isValid(parseISO(analysisDate))) {
      continue;
    }

    const carbonFraction = PercentageStringSchema.safeParse(carbonFractionRaw);
    const moistureFraction =
      PercentageStringSchema.safeParse(moistureFractionRaw);

    if (!carbonFraction.success || !moistureFraction.success) {
      continue;
    }

    if (
      isNil(newest) ||
      isAfter(parseISO(analysisDate), parseISO(newest.analysisDate))
    ) {
      newest = {
        analysisDate,
        carbonFraction: carbonFraction.data,
        moistureFraction: moistureFraction.data,
      };
    }
  }

  return newest;
};

export const resolveOthersIfOrganicCarbonFraction = (
  othersIfOrganicContext: OthersIfOrganicContext | undefined,
  generatorCharacterization: GeneratorCarbonCharacterization | undefined,
  pickUpDate: NonEmptyString | undefined,
  processorErrors: PreventedEmissionsProcessorErrors,
): OthersIfOrganicCarbonResolution => {
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

  const authorEntry =
    OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE[
      normalizedLocalWasteClassificationId
    ];

  if (authorEntry) {
    return {
      carbonFraction: authorEntry.carbonFraction,
      resolved: true,
      source: 'author',
    };
  }

  if (generatorCharacterization && isNonEmptyString(pickUpDate)) {
    if (
      isCarbonCharacterizationValid(
        generatorCharacterization.analysisDate,
        pickUpDate,
      )
    ) {
      return {
        analysisDate: generatorCharacterization.analysisDate,
        carbonFraction: generatorCharacterization.carbonFraction,
        moistureFraction: generatorCharacterization.moistureFraction,
        resolved: true,
        source: 'generator',
      };
    }

    return { reason: 'expired', resolved: false };
  }

  return { reason: 'missing', resolved: false };
};

export const buildOthersIfOrganicAuditDetails = (
  normalizedLocalWasteClassificationId: NonEmptyString,
  carbonFraction: PercentageString,
  baseline: BoldBaseline,
): OthersIfOrganicAuditDetails => {
  const formulaCoeffsRaw = OTHERS_IF_ORGANIC_BASELINE_FORMULA[baseline];
  const formulaCoeffs = {
    intercept: new BigNumber(formulaCoeffsRaw.intercept).toNumber(),
    slope: new BigNumber(formulaCoeffsRaw.slope).toNumber(),
  };
  const computedFactor = calculateOthersIfOrganicFactor(
    baseline,
    carbonFraction,
  );

  return {
    canonicalLocalWasteClassificationCode: normalizedLocalWasteClassificationId,
    carbonFraction,
    computedFactor,
    formulaCoeffs,
  };
};
