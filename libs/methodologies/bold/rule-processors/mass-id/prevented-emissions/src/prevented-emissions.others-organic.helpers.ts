import {
  isNil,
  isNonEmptyString,
  normalizeString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { WASTE_CLASSIFICATION_CODES } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/regional-waste-classification';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type NonEmptyString,
  NonNegativeFloat,
  Percentage,
} from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';

import {
  OTHERS_IF_ORGANIC_BASELINE_FORMULA,
  OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE,
} from './prevented-emissions.constants';
import { type OthersIfOrganicRuleSubjectIds } from './prevented-emissions.types';

const { LOCAL_WASTE_CLASSIFICATION_ID } = DocumentEventAttributeName;
const { PICK_UP } = DocumentEventName;

export interface OthersIfOrganicAuditDetails {
  canonicalLocalWasteClassificationCode: NonEmptyString;
  carbonFraction: Percentage;
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
  massIDDocument: Document,
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
  baseline: MethodologyBaseline,
  carbonFraction: Percentage,
): NonNegativeFloat => {
  const { intercept, slope } = OTHERS_IF_ORGANIC_BASELINE_FORMULA[baseline];

  return new BigNumber(slope)
    .multipliedBy(new BigNumber(carbonFraction.toString()))
    .plus(intercept)
    .decimalPlaces(6, BigNumber.ROUND_HALF_DOWN)
    .toNumber();
};

export const getOthersIfOrganicAuditDetails = (
  normalizedLocalWasteClassificationId: NonEmptyString,
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
    intercept: new BigNumber(formulaCoeffsRaw.intercept).toNumber(),
    slope: new BigNumber(formulaCoeffsRaw.slope).toNumber(),
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
