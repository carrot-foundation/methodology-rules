import { isNonEmptyString, normalizeString } from '@carrot-fndn/shared/helpers';

import {
  SUBTYPE_TO_CDM_CODE_MAP,
  WASTE_CLASSIFICATION_CODES,
} from './waste-classification.constants';

export const NO_ELIGIBLE_SUBTYPE = 'none';

export interface BrWasteClassification {
  CDM_CODE: string;
  description: string;
  id: BrWasteClassificationId;
}

export interface WasteSubtypeClassificationEvidence {
  cdmCode?: string;
  expectedSubtype?: string;
  localWasteClassificationId?: string;
  subtype?: string;
}

type BrWasteClassificationId = keyof typeof WASTE_CLASSIFICATION_CODES.BR;

export const WASTE_SUBTYPE_CLASSIFICATION_EVIDENCE_FIELDS = [
  'subtype',
  'localWasteClassificationId',
  'cdmCode',
  'expectedSubtype',
] as const satisfies ReadonlyArray<keyof WasteSubtypeClassificationEvidence>;

export const EXPECTED_SUBTYPE_GUIDANCE =
  'Envie o subtipo indicado em "expectedSubtype", que corresponde ao código CDM ("cdmCode") do "Local Waste Classification ID" informado. Se "expectedSubtype" for "none", esse código não tem subtipo elegível na metodologia: confira o código de classificação do resíduo.';

const BR_WASTE_CLASSIFICATION_IDS = Object.keys(
  WASTE_CLASSIFICATION_CODES.BR,
) as BrWasteClassificationId[];

export const findBrWasteClassification = (
  localWasteClassificationId: unknown,
): BrWasteClassification | undefined => {
  if (!isNonEmptyString(localWasteClassificationId)) {
    return undefined;
  }

  const id = BR_WASTE_CLASSIFICATION_IDS.find(
    (validId) =>
      normalizeString(validId) === normalizeString(localWasteClassificationId),
  );

  return id === undefined
    ? undefined
    : { ...WASTE_CLASSIFICATION_CODES.BR[id], id };
};

export const getSubtypeByCdmCode = (cdmCode: string): string | undefined =>
  [...SUBTYPE_TO_CDM_CODE_MAP].find(([, code]) => code === cdmCode)?.[0];

export const getWasteSubtypeClassificationEvidence = ({
  localWasteClassificationId,
  subtype,
}: {
  localWasteClassificationId: unknown;
  subtype: string | undefined;
}): WasteSubtypeClassificationEvidence => {
  const classification = findBrWasteClassification(localWasteClassificationId);

  return {
    ...(isNonEmptyString(subtype) && { subtype }),
    ...(isNonEmptyString(localWasteClassificationId) && {
      localWasteClassificationId,
    }),
    ...(classification && {
      cdmCode: classification.CDM_CODE,
      expectedSubtype:
        getSubtypeByCdmCode(classification.CDM_CODE) ?? NO_ELIGIBLE_SUBTYPE,
    }),
  };
};
