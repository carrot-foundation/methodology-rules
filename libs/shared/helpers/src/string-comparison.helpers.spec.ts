import {
  aggressiveNormalize,
  dateDifferenceInDays,
  DEFAULT_NAME_MATCH_THRESHOLD,
  diceCoefficient,
  isAddressMatch,
  isNameMatch,
  isOcrPlausiblePlateMatch,
  normalizeAddress,
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

    it('should split letter-digit boundaries', () => {
      expect(aggressiveNormalize('Bellegard,400')).toBe('bellegard 400');
      expect(aggressiveNormalize('ABC123')).toBe('abc 123');
      expect(aggressiveNormalize('123ABC')).toBe('123 abc');
      expect(aggressiveNormalize('test42value')).toBe('test 42 value');
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
        'VERDE CAMPO DO BRASIL INDUSTRIA E COMERCIO LTDA',
        'VERDE CAMPO DO BRASIL LTDA',
      );

      expect(result.isMatch).toBe(false);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.score).toBeLessThan(DEFAULT_NAME_MATCH_THRESHOLD);
    });

    describe('with token subset enabled', () => {
      it('should match when one name has extra business-type words not present in the other', () => {
        const result = isNameMatch(
          'VERDE CAMPO DO BRASIL INDUSTRIA E COMERCIO LTDA',
          'VERDE CAMPO DO BRASIL LTDA',
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

      it('should not treat single-digit tokens as prefixes (e.g. 1 should not match 10)', () => {
        const result = isNameMatch(
          'EMPRESA 1 LTDA',
          'EMPRESA 10 COMERCIO LTDA',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(false);
      });

      it('should match regardless of which argument has the extra words', () => {
        const result = isNameMatch(
          'VERDE CAMPO DO BRASIL LTDA',
          'VERDE CAMPO DO BRASIL INDUSTRIA E COMERCIO LTDA',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should not match when the shorter name has fewer than 2 meaningful tokens', () => {
        const result = isNameMatch(
          'LTDA',
          'VERDE CAMPO DO BRASIL LTDA',
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

      it('should match addresses with merged number and extra locality', () => {
        const result = isNameMatch(
          'Rua Exemplo,400 Bairro Centro, Cidade, SP',
          'R Exemplo, 400, Cidade, SP',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should match when tokens have minor spelling differences', () => {
        const result = isNameMatch(
          'Rua Flores Amarelas, 2045, Cidade, PR',
          'Rua Florez Amarellas,2045 Bairro Norte, Cidade, PR',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should match when one side omits a street prefix token', () => {
        const result = isNameMatch(
          'Rua Girassol Dourado, 125, Cidade, PR',
          'Girassol Douraddo, 125 Bairro Central, Cidade, PR',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(true);
      });

      it('should not tolerate numeric token mismatches even with 4+ meaningful tokens', () => {
        const result = isNameMatch(
          'ACME Ind 100 Prod Servicos',
          'ACME Ind 200 Prod Servicos Ambientais Ltda',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(false);
      });

      it('should not allow tolerance when shorter has fewer than 4 meaningful tokens', () => {
        const result = isNameMatch(
          'Rua Exemplo, Cidade',
          'Avenida Diferente, Cidade',
          DEFAULT_NAME_MATCH_THRESHOLD,
          true,
        );

        expect(result.isMatch).toBe(false);
      });
    });
  });

  describe('normalizeAddress', () => {
    it('should expand "al" to "alameda"', () => {
      expect(normalizeAddress('Al Jacaranda, 1')).toBe('alameda jacaranda 1');
    });

    it('should expand "rod" to "rodovia"', () => {
      expect(normalizeAddress('Rod Exemplo, 100')).toBe('rodovia exemplo 100');
    });

    it('should expand "av" to "avenida"', () => {
      expect(normalizeAddress('Av Brasil, 500')).toBe('avenida brasil 500');
    });

    it('should expand "r" to "rua" only as standalone token', () => {
      expect(normalizeAddress('R Exemplo, 10')).toBe('rua exemplo 10');
    });

    it('should not expand tokens that are not abbreviations', () => {
      expect(normalizeAddress('Alameda Jacaranda, 1')).toBe(
        'alameda jacaranda 1',
      );
    });

    it('should deduplicate consecutive identical tokens', () => {
      expect(normalizeAddress('KM 5 KM 5 Bairro')).toBe('km 5 bairro');
    });

    it('should deduplicate longer consecutive runs', () => {
      expect(normalizeAddress('RODOVIA PR 423KM KM 24 3 KM 24 3 JARDIM')).toBe(
        'rodovia pr 423 km 24 3 jardim',
      );
    });

    it('should handle accents and punctuation like aggressiveNormalize', () => {
      expect(normalizeAddress('Av. São Paulo, 100')).toBe(
        'avenida sao paulo 100',
      );
    });

    it('should handle empty string', () => {
      expect(normalizeAddress('')).toBe('');
    });

    it('should split digit sequences separated by punctuation', () => {
      expect(normalizeAddress('BR-116,2007 Bairro')).toBe('br 116 2007 bairro');
    });

    it('should split route and street number joined by comma', () => {
      expect(normalizeAddress('BR-376,22591 Miringuava')).toBe(
        'br 376 22591 miringuava',
      );
    });
  });

  describe('isAddressMatch', () => {
    it('should match when one side uses street abbreviation and other uses full name', () => {
      const result = isAddressMatch(
        'Al Jacaranda, 1, Cidade dos Pinheiros, SP',
        'Alameda Jacaranda, 01 Bairro Norte, Cidade dos Pinheiros, SP',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match when OCR produces duplicate tokens', () => {
      const result = isAddressMatch(
        'Rod Exemplo, 423, Cidade Nova, PR',
        'RODOVIA EXEMPLO 423KM,S/N SN,KM 24,3 KM 24,3 JARDIM, Cidade Nova, PR',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match identical addresses', () => {
      const result = isAddressMatch(
        'Rua Exemplo, 100, Cidade, SP',
        'Rua Exemplo, 100, Cidade, SP',
      );

      expect(result.isMatch).toBe(true);
      expect(result.score).toBe(1);
    });

    it('should not match truly different addresses', () => {
      const result = isAddressMatch(
        'Avenida Alpha, 100, Cidade, SP',
        'Rua Beta, 200, Cidade, SP',
      );

      expect(result.isMatch).toBe(false);
    });

    it('should not match addresses with different street numbers', () => {
      const result = isAddressMatch(
        'Rua Exemplo, 100, Cidade, SP',
        'Rua Exemplo, 200, Cidade, SP',
      );

      expect(result.isMatch).toBe(false);
    });

    it('should match when "Rod" abbreviation is used for "Rodovia"', () => {
      const result = isAddressMatch(
        'Rod Brasil, 100, Cidade, PR',
        'Rodovia Brasil, 100, Cidade, PR',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should not match addresses with same number but completely different names', () => {
      const result = isAddressMatch(
        'Rua Alpha, 100, Cidade, SP',
        'Avenida Beta, 100, Metropole, RJ',
      );

      expect(result.isMatch).toBe(false);
    });

    it('should match addresses where street number has leading zeros', () => {
      const result = isAddressMatch(
        'Rua Exemplo, 001, Cidade, SP',
        'Rua Exemplo, 1, Cidade, SP',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match addresses where street number is all zeros', () => {
      const result = isAddressMatch(
        'Rua Exemplo, 000, Cidade, SP',
        'Rua Exemplo, 0, Cidade, SP',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match when first address has more numeric tokens than the second', () => {
      const result = isAddressMatch(
        'Rua Exemplo, 100, Lote 50, Cidade, SP',
        'Rua Exemplo, 100, Cidade, SP',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match via token subset when first address has more tokens and dice score is low', () => {
      const result = isAddressMatch(
        'Rua Exemplo, Complemento Lote B, 100, Cidade Grande, Estado, SP',
        'R Exemplo, 100, SP',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match when extracted address has route and number joined by comma', () => {
      const result = isAddressMatch(
        'BR-376,22591 Miringuava, Sao Jose dos Pinhais, PR',
        'Rod Br-376, 22591, São José dos Pinhais, PR',
      );

      expect(result.isMatch).toBe(true);
    });

    it('should match when source document has duplicated street number', () => {
      const result = isAddressMatch(
        'RUA Exemplo, 210210 Bairro Norte, Cidade, SP',
        'RUA Exemplo, 210, Cidade, SP',
      );

      expect(result.isMatch).toBe(true);
    });
  });

  describe('isOcrPlausiblePlateMatch', () => {
    it('should return true for I/1 OCR confusion', () => {
      expect(isOcrPlausiblePlateMatch('XYZ1I23', 'XYZ1123')).toBe(true);
    });

    it('should return true for B/8 OCR confusion', () => {
      expect(isOcrPlausiblePlateMatch('FAK3B99', 'FAK3899')).toBe(true);
    });

    it('should return true for O/0 OCR confusion', () => {
      expect(isOcrPlausiblePlateMatch('ABC0D23', 'ABCOD23')).toBe(true);
    });

    it('should return true for S/5 OCR confusion', () => {
      expect(isOcrPlausiblePlateMatch('AB5CD23', 'ABSCD23')).toBe(true);
    });

    it('should return true for Z/2 OCR confusion', () => {
      expect(isOcrPlausiblePlateMatch('ABZ1D23', 'AB21D23')).toBe(true);
    });

    it('should return true for D/0 OCR confusion', () => {
      expect(isOcrPlausiblePlateMatch('ABC1D23', 'ABC1023')).toBe(true);
    });

    it('should return true for G/6 OCR confusion', () => {
      expect(isOcrPlausiblePlateMatch('ABG1D23', 'AB61D23')).toBe(true);
    });

    it('should return true for exact match after normalization', () => {
      expect(isOcrPlausiblePlateMatch('ABC-1D23', 'abc 1d23')).toBe(true);
    });

    it('should return false for non-OCR single char difference', () => {
      expect(isOcrPlausiblePlateMatch('ABC1D23', 'ABC1D24')).toBe(false);
    });

    it('should return false when more than 1 character differs', () => {
      expect(isOcrPlausiblePlateMatch('ABC1D23', 'XYZ1D23')).toBe(false);
    });

    it('should return false for different length plates', () => {
      expect(isOcrPlausiblePlateMatch('ABC1D23', 'ABC1D234')).toBe(false);
    });

    it('should return false when two OCR-confusable chars differ', () => {
      expect(isOcrPlausiblePlateMatch('XYZ1I23', 'X1Z1123')).toBe(false);
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
