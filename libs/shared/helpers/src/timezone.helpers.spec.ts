import { getTimezoneFromAddress, utcIsoToLocalDate } from './timezone.helpers';

describe('timezone.helpers', () => {
  describe('utcIsoToLocalDate', () => {
    it('should convert a UTC datetime to local date when time crosses midnight', () => {
      // 2024-11-01T02:45:00.000Z = 2024-10-31T23:45 in America/Sao_Paulo (UTC-3)
      expect(
        utcIsoToLocalDate('2024-11-01T02:45:00.000Z', 'America/Sao_Paulo'),
      ).toBe('2024-10-31');
    });

    it('should return the same calendar date when time does not cross midnight', () => {
      // 2024-11-01T12:00:00.000Z = 2024-11-01T09:00 in America/Sao_Paulo
      expect(
        utcIsoToLocalDate('2024-11-01T12:00:00.000Z', 'America/Sao_Paulo'),
      ).toBe('2024-11-01');
    });

    it('should use the provided timezone for conversion', () => {
      // 2024-11-01T04:45:00.000Z = 2024-10-31T23:45 in America/Rio_Branco (UTC-5)
      expect(
        utcIsoToLocalDate('2024-11-01T04:45:00.000Z', 'America/Rio_Branco'),
      ).toBe('2024-10-31');
    });

    it('should return the UTC date when timezone is UTC', () => {
      expect(utcIsoToLocalDate('2024-11-01T02:45:00.000Z', 'UTC')).toBe(
        '2024-11-01',
      );
    });

    it('should pass through a date-only string unchanged', () => {
      expect(utcIsoToLocalDate('2024-10-31', 'America/Sao_Paulo')).toBe(
        '2024-10-31',
      );
    });
  });

  describe('getTimezoneFromAddress', () => {
    it('should return America/Sao_Paulo for most Brazilian states', () => {
      expect(getTimezoneFromAddress('BR', 'SP')).toBe('America/Sao_Paulo');
      expect(getTimezoneFromAddress('BR', 'RJ')).toBe('America/Sao_Paulo');
      expect(getTimezoneFromAddress('BR', 'MG')).toBe('America/Sao_Paulo');
    });

    it('should return the correct timezone for Brazilian states with non-default offsets', () => {
      expect(getTimezoneFromAddress('BR', 'AC')).toBe('America/Rio_Branco');
      expect(getTimezoneFromAddress('BR', 'AM')).toBe('America/Manaus');
      expect(getTimezoneFromAddress('BR', 'MT')).toBe('America/Cuiaba');
      expect(getTimezoneFromAddress('BR', 'MS')).toBe('America/Campo_Grande');
      expect(getTimezoneFromAddress('BR', 'RO')).toBe('America/Porto_Velho');
      expect(getTimezoneFromAddress('BR', 'RR')).toBe('America/Boa_Vista');
    });

    it('should default to America/Sao_Paulo when country is BR but state is absent', () => {
      expect(getTimezoneFromAddress('BR')).toBe('America/Sao_Paulo');
    });

    it('should return UTC for unknown country codes', () => {
      expect(getTimezoneFromAddress('US', 'CA')).toBe('UTC');
      expect(getTimezoneFromAddress('DE')).toBe('UTC');
    });
  });
});
