import { SUBTYPE_TO_CDM_CODE_MAP } from '@carrot-fndn/shared/methodologies/bold/utils';

export const getCdmCodeFromSubtype = (subtype: string): string | undefined =>
  SUBTYPE_TO_CDM_CODE_MAP.get(subtype);
