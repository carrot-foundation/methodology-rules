import { isNonEmptyString, normalizeString } from '@carrot-fndn/shared/helpers';
import { EVIDENCE_FIELD_LABELS } from '@carrot-fndn/shared/rule/result';
import { type BoldAttributeValue } from '@carrot-fndn/shared/types';

import {
  SUBTYPE_TO_CDM_CODE_MAP,
  WASTE_CLASSIFICATION_CODES,
} from './waste-classification.constants';

export interface BrWasteClassification {
  CDM_CODE: string;
  description: string;
  id: BrWasteClassificationId;
}

export interface WasteSubtypeClassificationEvidence {
  cdmCode?: string;
  expectedSubtype: string;
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

export const UNKNOWN_CLASSIFICATION_EXPECTED_SUBTYPE =
  'nenhum: o código Ibama não foi informado ou não é aceito';

export const EXPECTED_SUBTYPE_GUIDANCE = `Envie exatamente um dos subtipos listados em "${EVIDENCE_FIELD_LABELS.expectedSubtype}", sem as aspas: são os que correspondem ao "${EVIDENCE_FIELD_LABELS.cdmCode}" do "${EVIDENCE_FIELD_LABELS.localWasteClassificationId}" (o "Local Waste Classification ID" do evento "Pick-up"). Se o código estiver errado, corrija-o. Quando "${EVIDENCE_FIELD_LABELS.expectedSubtype}" começa com "nenhum", nenhum subtipo é aceito e o motivo vem em seguida: a categoria CDM do código não é aceita pela metodologia, ou o código Ibama não foi informado ou não é aceito; confira o código de classificação do resíduo.`;

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

// Subtype names contain commas, so each option is quoted to read as one value
const formatExpectedSubtype = (cdmCode: string): string => {
  const subtypes = getSubtypesByCdmCode(cdmCode);

  return subtypes.length === 0
    ? `nenhum: a categoria CDM ${cdmCode} não é aceita pela metodologia`
    : subtypes.map((subtype) => `“${subtype}”`).join(' ou ');
};

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
    expectedSubtype: UNKNOWN_CLASSIFICATION_EXPECTED_SUBTYPE,
    ...(classification && {
      cdmCode: classification.CDM_CODE,
      expectedSubtype: formatExpectedSubtype(classification.CDM_CODE),
      localWasteClassificationId: classification.id,
    }),
  };
};
