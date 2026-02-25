import { differenceInDays, parse, parseISO } from 'date-fns';

/**
 * Aggressively normalizes a string for comparison purposes.
 * Strips accents/diacritics, lowercases, removes punctuation, collapses whitespace.
 */
export const aggressiveNormalize = (value: string): string =>
  value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replaceAll(/[^\d\sa-z]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();

/**
 * Computes the Sorensen-Dice coefficient between two strings.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export const diceCoefficient = (a: string, b: string): number => {
  if (a === b) {
    return 1;
  }

  if (a.length < 2 || b.length < 2) {
    return 0;
  }

  const bigramsA = new Map<string, number>();

  for (let index = 0; index < a.length - 1; index++) {
    const bigram = a.slice(index, index + 2);

    bigramsA.set(bigram, (bigramsA.get(bigram) ?? 0) + 1);
  }

  let intersection = 0;

  for (let index = 0; index < b.length - 1; index++) {
    const bigram = b.slice(index, index + 2);
    const count = bigramsA.get(bigram);

    if (count !== undefined && count > 0) {
      bigramsA.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2 * intersection) / (a.length - 1 + (b.length - 1));
};

export const DEFAULT_NAME_MATCH_THRESHOLD = 0.75;

const MEANINGFUL_TOKEN_MIN_LENGTH = 2;
const MIN_MEANINGFUL_TOKENS = 2;

/**
 * Checks if all tokens of `shorter` can be matched in `longer`.
 * Single-character tokens are treated as abbreviation prefixes (e.g. "A" matches "Abracadabra").
 * Requires at least MIN_MEANINGFUL_TOKENS tokens of length >= MEANINGFUL_TOKEN_MIN_LENGTH
 * in the shorter list to avoid spurious matches on single-suffix names.
 */
const fuzzyTokenSubset = (shorter: string[], longer: string[]): boolean => {
  const meaningfulCount = shorter.filter(
    (t) => t.length >= MEANINGFUL_TOKEN_MIN_LENGTH,
  ).length;

  if (meaningfulCount < MIN_MEANINGFUL_TOKENS) {
    return false;
  }

  const pool = [...longer];

  for (const token of shorter) {
    const index = pool.findIndex((lt) =>
      token.length === 1 ? lt.startsWith(token) : lt === token,
    );

    if (index === -1) {
      return false;
    }

    pool.splice(index, 1);
  }

  return true;
};

/**
 * Checks whether two names match using aggressive normalization and Dice coefficient.
 * When `useTokenSubset` is true, also matches if all tokens of the shorter name are
 * present in the longer name (with single-character tokens treated as abbreviation prefixes).
 * Use `useTokenSubset` only for entity names and addresses, not for generic string comparison.
 */
export const isNameMatch = (
  a: string,
  b: string,
  threshold = DEFAULT_NAME_MATCH_THRESHOLD,
  useTokenSubset = false,
): { isMatch: boolean; score: number } => {
  const normalizedA = aggressiveNormalize(a);
  const normalizedB = aggressiveNormalize(b);
  const score = diceCoefficient(normalizedA, normalizedB);

  if (score >= threshold) {
    return { isMatch: true, score };
  }

  if (useTokenSubset) {
    const tokensA = normalizedA.split(' ');
    const tokensB = normalizedB.split(' ');
    const [shorter, longer] =
      tokensA.length <= tokensB.length
        ? [tokensA, tokensB]
        : [tokensB, tokensA];

    if (fuzzyTokenSubset(shorter, longer)) {
      return { isMatch: true, score };
    }
  }

  return { isMatch: false, score };
};

/**
 * Normalizes a vehicle license plate by removing dashes, spaces, and uppercasing.
 */
export const normalizeVehiclePlate = (plate: string): string =>
  plate.replaceAll(/[-\s]/g, '').toUpperCase();

const BRAZILIAN_DATE_FORMATS = ['dd/MM/yyyy', 'dd-MM-yyyy'];

/**
 * Parses a date string (DD/MM/YYYY Brazilian format or ISO) to YYYY-MM-DD.
 * Returns undefined if unparseable.
 */
export const normalizeDateToISO = (value: string): string | undefined => {
  const trimmed = value.trim();

  // Try ISO format first (YYYY-MM-DD or ISO datetime)
  const isoDate = parseISO(trimmed);

  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split('T')[0];
  }

  // Try Brazilian date formats
  for (const formatString of BRAZILIAN_DATE_FORMATS) {
    const parsed = parse(trimmed, formatString, new Date());

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }

  return undefined;
};

/**
 * Computes the absolute difference in days between two date strings.
 * Accepts any format supported by normalizeDateToISO.
 * Returns undefined if either date is unparseable.
 */
export const dateDifferenceInDays = (
  dateA: string,
  dateB: string,
): number | undefined => {
  const isoA = normalizeDateToISO(dateA);
  const isoB = normalizeDateToISO(dateB);

  if (!isoA || !isoB) {
    return undefined;
  }

  return Math.abs(differenceInDays(parseISO(isoA), parseISO(isoB)));
};
