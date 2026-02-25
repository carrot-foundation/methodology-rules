const BRAZIL_STATE_TIMEZONES = new Map<string, string>([
  ['AC', 'America/Rio_Branco'],
  ['AM', 'America/Manaus'],
  ['MS', 'America/Campo_Grande'],
  ['MT', 'America/Cuiaba'],
  ['RO', 'America/Porto_Velho'],
  ['RR', 'America/Boa_Vista'],
]);

/**
 * Converts a UTC ISO datetime string to a local date string (YYYY-MM-DD) in the given timezone.
 * If the input is already a date-only string (no 'T'), it is returned as-is.
 */
export const utcIsoToLocalDate = (utcIso: string, timezone: string): string => {
  if (!utcIso.includes('T')) {
    return utcIso.slice(0, 10);
  }

  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).format(new Date(utcIso));
};

/**
 * Returns an IANA timezone string for the given ISO 3166-1 country code and optional state/province.
 * Defaults to 'America/Sao_Paulo' for Brazil and 'UTC' for unknown countries.
 */
export const getTimezoneFromAddress = (
  countryCode: string,
  countryState?: string,
): string => {
  if (countryCode === 'BR') {
    return (
      (countryState && BRAZIL_STATE_TIMEZONES.get(countryState)) ??
      'America/Sao_Paulo'
    );
  }

  return 'UTC';
};
