import { SUBTYPE_TO_CDM_CODE_MAP } from '@carrot-fndn/shared/methodologies/bold/utils';

const isAlphaNumericUnicode = (ch: string): boolean => /\p{L}|\p{N}/u.test(ch);

export const getCdmCodeFromSubtype = (subtype: string): string | undefined =>
  SUBTYPE_TO_CDM_CODE_MAP.get(subtype);

export const normalizeDescriptionForComparison = (value: string): string => {
  const normalized = value.normalize('NFKC').trim();

  let start = 0;
  let end = normalized.length - 1;

  while (start <= end && !isAlphaNumericUnicode(normalized.charAt(start))) {
    start += 1;
  }

  while (end >= start && !isAlphaNumericUnicode(normalized.charAt(end))) {
    end -= 1;
  }

  return normalized.slice(start, end + 1);
};
