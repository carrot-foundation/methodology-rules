import {
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  parsePeriodRange,
} from './cross-validation.helpers';

describe('cross-validation.helpers', () => {
  describe('matchWasteTypeEntry', () => {
    it('should match when code and description both match', () => {
      const result = matchWasteTypeEntry(
        { code: '190812', description: 'Lodos de tratamento' },
        '190812',
        'Lodos de tratamento',
      );

      expect(result.isMatch).toBe(true);
      expect(result.isCodeMatch).toBe(true);
    });

    it('should match by description only when no code on either side', () => {
      const result = matchWasteTypeEntry(
        { description: 'Plastico' },
        undefined,
        'Plastico',
      );

      expect(result.isMatch).toBe(true);
      expect(result.isCodeMatch).toBeNull();
    });

    it('should not match when codes differ', () => {
      const result = matchWasteTypeEntry(
        { code: '020101', description: 'Lodos' },
        '190812',
        'Lodos de tratamento',
      );

      expect(result.isMatch).toBe(false);
      expect(result.isCodeMatch).toBe(false);
    });

    it('should not match when no event description or code', () => {
      const result = matchWasteTypeEntry(
        { code: '190812', description: 'Lodos' },
        undefined,
        undefined,
      );

      expect(result.isMatch).toBe(false);
    });

    it('should normalize waste codes with spaces', () => {
      const result = matchWasteTypeEntry(
        { code: '19 08 12', description: 'Lodos de tratamento' },
        '190812',
        'Lodos de tratamento',
      );

      expect(result.isMatch).toBe(true);
      expect(result.isCodeMatch).toBe(true);
    });
  });

  describe('normalizeQuantityToKg', () => {
    it('should return quantity as-is when unit is undefined', () => {
      expect(normalizeQuantityToKg(100, undefined)).toBe(100);
    });

    it('should return quantity as-is when unit is kg', () => {
      expect(normalizeQuantityToKg(100, 'kg')).toBe(100);
    });

    it('should multiply by 1000 when unit is ton', () => {
      expect(normalizeQuantityToKg(2, 'ton')).toBe(2000);
    });

    it('should multiply by 1000 when unit is t', () => {
      expect(normalizeQuantityToKg(3, 't')).toBe(3000);
    });

    it('should multiply by 1000 when unit is tonelada', () => {
      expect(normalizeQuantityToKg(1.12, 'tonelada')).toBe(1120);
    });

    it('should return undefined for unknown units', () => {
      expect(normalizeQuantityToKg(5, 'm³')).toBeUndefined();
    });
  });

  describe('parsePeriodRange', () => {
    it('should parse "ate" separator', () => {
      const result = parsePeriodRange('01/01/2024 ate 31/01/2024');

      expect(result).toEqual({ end: '31/01/2024', start: '01/01/2024' });
    });

    it('should parse "a" separator', () => {
      const result = parsePeriodRange('01/02/2024 a 28/02/2024');

      expect(result).toEqual({ end: '28/02/2024', start: '01/02/2024' });
    });

    it('should return undefined for invalid format', () => {
      const result = parsePeriodRange('January 2024');

      expect(result).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      const result = parsePeriodRange('01/01/2024 ATE 31/01/2024');

      expect(result).toEqual({ end: '31/01/2024', start: '01/01/2024' });
    });
  });
});
