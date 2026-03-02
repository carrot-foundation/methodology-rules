import { clearRegistry } from '@carrot-fndn/shared/document-extractor';

import {
  createRecyclerEntity,
  extractMtrNumbers,
  extractRecyclerFromPreamble,
  finalizeCdfExtraction,
} from './cdf-shared.helpers';

describe('CDF shared helpers', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('extractRecyclerFromPreamble', () => {
    const preamblePattern =
      /^(.+?),\s*CPF\/CNPJ\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+certifica/m;

    it('should extract recycler name and CNPJ from preamble', () => {
      const text =
        'ADUBOS VERDES ORGANICOS LTDA, CPF/CNPJ 44.555.666/0001-88 certifica que recebeu';

      const result = extractRecyclerFromPreamble(text, preamblePattern);

      expect(result).toEqual({
        rawMatch: expect.any(String),
        value: {
          name: 'ADUBOS VERDES ORGANICOS LTDA',
          taxId: '44.555.666/0001-88',
        },
      });
    });

    it('should return undefined when preamble is not found', () => {
      expect(
        extractRecyclerFromPreamble('Random text', preamblePattern),
      ).toBeUndefined();
    });

    it('should handle unformatted CNPJ with custom pattern', () => {
      const unformattedPattern = /^(.+?),\s*CPF\/CNPJ\s+(\d{14})\s+certifica/m;
      const text =
        'EMPRESA LTDA, CPF/CNPJ 44555666000188 certifica que recebeu';

      const result = extractRecyclerFromPreamble(text, unformattedPattern);

      expect(result?.value.taxId).toBe('44555666000188');
    });
  });

  describe('createRecyclerEntity', () => {
    it('should create high confidence entity from extracted data', () => {
      const result = createRecyclerEntity({
        rawMatch: 'ADUBOS VERDES, CPF/CNPJ 44.555.666/0001-88 certifica',
        value: {
          name: 'ADUBOS VERDES',
          taxId: '44.555.666/0001-88',
        },
      });

      expect(result.name.parsed).toBe('ADUBOS VERDES');
      expect(result.name.confidence).toBe('high');
      expect(result.taxId.parsed).toBe('44.555.666/0001-88');
    });

    it('should create low confidence entity when undefined', () => {
      const result = createRecyclerEntity(undefined);

      expect(result.name.confidence).toBe('low');
      expect(result.taxId.confidence).toBe('low');
    });
  });

  describe('extractMtrNumbers', () => {
    it('should extract 10-digit MTR numbers', () => {
      const text = [
        'MTRs incluidos',
        '2302037916, 2302037795, 2302037801',
        'Nome do Responsavel',
      ].join('\n');

      const pattern =
        // eslint-disable-next-line sonarjs/slow-regex
        /MTRs?\s+incluidos\s*\n([\s\S]*?)(?=\nNome\s+do\s+Responsavel|$)/i;

      const result = extractMtrNumbers(text, pattern, 10);

      expect(result).toEqual(['2302037916', '2302037795', '2302037801']);
    });

    it('should extract 12-digit MTR numbers', () => {
      const text = ['Manifestos Incluidos:', '240001460711, 240001460712'].join(
        '\n',
      );

      const pattern =
        // eslint-disable-next-line sonarjs/slow-regex
        /Manifestos\s+Incluidos\s*:?\s*\n?([\s\S]*?)(?=\nNome|$)/i;

      const result = extractMtrNumbers(text, pattern, 12);

      expect(result).toEqual(['240001460711', '240001460712']);
    });

    it('should return empty array when section is not found', () => {
      // eslint-disable-next-line sonarjs/slow-regex
      const pattern = /MTRs?\s+incluidos\s*\n([\s\S]*?)$/i;

      expect(extractMtrNumbers('No MTR section', pattern, 10)).toEqual([]);
    });
  });

  describe('finalizeCdfExtraction', () => {
    it('should return extraction output with review required for low match score', () => {
      const result = finalizeCdfExtraction(
        {
          documentType: 'recyclingManifest',
          rawText: 'test' as never,
        },
        0.4,
        'test',
      );

      expect(result.data.documentType).toBe('recyclingManifest');
      expect(result.reviewRequired).toBe(true);
      expect(
        result.reviewReasons.some((r) => r.code === 'LOW_LAYOUT_MATCH_SCORE'),
      ).toBe(true);
    });
  });
});
