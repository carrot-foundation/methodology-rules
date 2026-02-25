import {
  aggressiveNormalize,
  dateDifferenceInDays,
  DEFAULT_NAME_MATCH_THRESHOLD,
  diceCoefficient,
  isNameMatch,
  normalizeDateToISO,
  normalizeVehiclePlate,
} from './string-comparison.helpers';

describe('string-comparison.helpers', () => {
  describe('aggressiveNormalize', () => {
    it('should strip accents and diacritics', () => {
      expect(aggressiveNormalize('São Paulo')).toBe('sao paulo');
      expect(aggressiveNormalize('résumé')).toBe('resume');
      expect(aggressiveNormalize('Ação')).toBe('acao');
    });

    it('should lowercase and remove punctuation', () => {
      expect(aggressiveNormalize('HELLO, WORLD!')).toBe('hello world');
      expect(aggressiveNormalize('Company S.A.')).toBe('company sa');
    });

    it('should collapse whitespace', () => {
      expect(aggressiveNormalize('  hello   world  ')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(aggressiveNormalize('')).toBe('');
    });
  });

  describe('diceCoefficient', () => {
    it('should return 1 for identical strings', () => {
      expect(diceCoefficient('hello', 'hello')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(diceCoefficient('abc', 'xyz')).toBe(0);
    });

    it('should return 0 for strings shorter than 2 characters', () => {
      expect(diceCoefficient('a', 'b')).toBe(0);
      expect(diceCoefficient('', '')).toBe(1); // identical empty strings
    });

    it('should return a score between 0 and 1 for similar strings', () => {
      const score = diceCoefficient('night', 'nacht');

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should return high score for very similar strings', () => {
      const score = diceCoefficient(
        'reciclagem verde ltda',
        'reciclagem verde ltda me',
      );

      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('isNameMatch', () => {
    it('should match identical names', () => {
      const result = isNameMatch('Company ABC', 'Company ABC');

      expect(result.isMatch).toBe(true);
      expect(result.score).toBe(1);
    });

    it('should match names with different casing and accents', () => {
      const result = isNameMatch(
        'RECICLAGEM VERDE LTDA',
        'Reciclagem Verde Ltda',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match names with minor differences above threshold', () => {
      const result = isNameMatch(
        'Reciclagem Verde Ltda',
        'Reciclagem Verde Ltda ME',
      );

      expect(result.isMatch).toBe(true);
      expect(result.score).toBeGreaterThan(0.6);
    });

    it('should not match completely different names', () => {
      const result = isNameMatch('Company A', 'Totally Different');

      expect(result.isMatch).toBe(false);
    });

    it('should respect custom threshold', () => {
      const result = isNameMatch('abc', 'abd', 0.9);

      expect(result.isMatch).toBe(false);
    });

    it('should not match when names differ only by extra business-type words and token subset is disabled', () => {
      const result = isNameMatch(
        'ROYAL CANIN DO BRASIL INDUSTRIA E COMERCIO LTDA',
        'ROYAL CANIN DO BRASIL LTDA',
      );

      expect(result.isMatch).toBe(false);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.score).toBeLessThan(DEFAULT_NAME_MATCH_THRESHOLD);
    });

    describe('with token subset enabled', () => {
      it('should match when one name has extra business-type words not present in the other', () => {
        const result = isNameMatch(
          'ROYAL CANIN DO BRASIL INDUSTRIA E COMERCIO LTDA',
          'ROYAL CANIN DO BRASIL LTDA',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should match when one name uses single-letter abbreviations for middle words', () => {
        const result = isNameMatch(
          'LEDA A B SHINE',
          'LEDA ABRACADABRA BAKED SHINE',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should match when abbreviated name uses dots that get stripped on normalization', () => {
        const result = isNameMatch(
          'LEDA A. B. SHINE',
          'LEDA ABRACADABRA BAKED SHINE',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should match regardless of which argument has the extra words', () => {
        const result = isNameMatch(
          'ROYAL CANIN DO BRASIL LTDA',
          'ROYAL CANIN DO BRASIL INDUSTRIA E COMERCIO LTDA',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should not match when the shorter name has fewer than 2 meaningful tokens', () => {
        const result = isNameMatch(
          'LTDA',
          'ROYAL CANIN DO BRASIL LTDA',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(false);
      });

      it('should not match completely different names', () => {
        const result = isNameMatch(
          'Company Alpha Services',
          'Totally Different Corp',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(false);
      });
    });
  });

  describe('normalizeVehiclePlate', () => {
    it('should strip dashes and spaces and uppercase', () => {
      expect(normalizeVehiclePlate('abc-1d23')).toBe('ABC1D23');
      expect(normalizeVehiclePlate('ABC 1234')).toBe('ABC1234');
      expect(normalizeVehiclePlate('abc1d23')).toBe('ABC1D23');
    });
  });

  describe('normalizeDateToISO', () => {
    it('should parse DD/MM/YYYY format', () => {
      expect(normalizeDateToISO('25/12/2024')).toBe('2024-12-25');
      expect(normalizeDateToISO('01/01/2025')).toBe('2025-01-01');
    });

    it('should parse ISO format', () => {
      expect(normalizeDateToISO('2024-12-25')).toBe('2024-12-25');
    });

    it('should parse ISO datetime format', () => {
      expect(normalizeDateToISO('2024-12-25T10:30:00Z')).toBe('2024-12-25');
    });

    it('should return undefined for unparseable dates', () => {
      expect(normalizeDateToISO('not-a-date')).toBeUndefined();
    });
  });

  describe('dateDifferenceInDays', () => {
    it('should return 0 for same date', () => {
      expect(dateDifferenceInDays('2024-12-25', '2024-12-25')).toBe(0);
    });

    it('should return absolute difference', () => {
      expect(dateDifferenceInDays('2024-12-25', '2024-12-28')).toBe(3);
      expect(dateDifferenceInDays('2024-12-28', '2024-12-25')).toBe(3);
    });

    it('should handle mixed formats', () => {
      expect(dateDifferenceInDays('25/12/2024', '2024-12-28')).toBe(3);
    });

    it('should handle ISO datetime vs Brazilian date', () => {
      expect(dateDifferenceInDays('2024-12-25T10:30:00Z', '25/12/2024')).toBe(
        0,
      );
    });

    it('should return undefined for unparseable dates', () => {
      expect(dateDifferenceInDays('invalid', '2024-12-25')).toBeUndefined();
    });
  });
});
