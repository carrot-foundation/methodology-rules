import { isNonEmptyString, normalizeString } from '@carrot-fndn/shared/helpers';
import { EVIDENCE_FIELD_LABELS } from '@carrot-fndn/shared/rule/result';
import { type BoldAttributeValue } from '@carrot-fndn/shared/types';

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

export const EXPECTED_SUBTYPE_GUIDANCE = `Envie o subtipo indicado em "${EVIDENCE_FIELD_LABELS.expectedSubtype}" (um deles, quando vierem separados por "|"), que corresponde ao "${EVIDENCE_FIELD_LABELS.cdmCode}" do "${EVIDENCE_FIELD_LABELS.localWasteClassificationId}" informado no "Local Waste Classification ID", ou corrija esse código se for ele o errado. Se "${EVIDENCE_FIELD_LABELS.expectedSubtype}" for "${NO_ELIGIBLE_SUBTYPE}", o código não tem subtipo elegível na metodologia; se estiver vazio, o "Local Waste Classification ID" do evento "Pick-up" está ausente ou não é aceito: confira o código de classificação do resíduo.`;

const BR_WASTE_CLASSIFICATION_IDS = Object.keys(
  WASTE_CLASSIFICATION_CODES.BR,
) as BrWasteClassificationId[];

export const findBrWasteClassification = (
  localWasteClassificationId: BoldAttributeValue | undefined,
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

export const getSubtypesByCdmCode = (cdmCode: string): string[] =>
  [...SUBTYPE_TO_CDM_CODE_MAP]
    .filter(([, code]) => code === cdmCode)
    .map(([subtype]) => subtype);

// Subtype names contain commas, so the report's comma join of an array would be ambiguous
const joinExpectedSubtypes = (subtypes: string[]): string =>
  subtypes.length === 0 ? NO_ELIGIBLE_SUBTYPE : subtypes.join(' | ');

export const getWasteSubtypeClassificationEvidence = ({
  localWasteClassificationId,
  subtype,
}: {
  localWasteClassificationId: BoldAttributeValue | undefined;
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
      expectedSubtype: joinExpectedSubtypes(
        getSubtypesByCdmCode(classification.CDM_CODE),
      ),
      localWasteClassificationId: classification.id,
    }),
  };
};
