import { clearRegistry } from '@carrot-fndn/shared/document-extractor';

import {
  createRecyclerEntity,
  extractMtrNumbers,
  extractRecyclerFromPreamble,
  extractWasteClassificationData,
  finalizeCdfExtraction,
  mergeWasteEntries,
  type WasteCodeInfo,
  type WasteDataInfo,
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
        'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu';

      const result = extractRecyclerFromPreamble(text, preamblePattern);

      expect(result).toEqual({
        rawMatch: expect.any(String),
        value: {
          name: 'ECO ADUBOS ORGANICOS LTDA',
          taxId: '13.843.890/0001-45',
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
        'EMPRESA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu';

      const result = extractRecyclerFromPreamble(text, unformattedPattern);

      expect(result?.value.taxId).toBe('13843890000145');
    });
  });

  describe('createRecyclerEntity', () => {
    it('should create high confidence entity from extracted data', () => {
      const result = createRecyclerEntity({
        rawMatch: 'ECO ADUBOS, CPF/CNPJ 13.843.890/0001-45 certifica',
        value: {
          name: 'ECO ADUBOS',
          taxId: '13.843.890/0001-45',
        },
      });

      expect(result.name.parsed).toBe('ECO ADUBOS');
      expect(result.name.confidence).toBe('high');
      expect(result.taxId.parsed).toBe('13.843.890/0001-45');
    });

    it('should create low confidence entity when undefined', () => {
      const result = createRecyclerEntity(undefined);

      expect(result.name.confidence).toBe('low');
      expect(result.taxId.confidence).toBe('low');
    });
  });

  describe('extractWasteClassificationData', () => {
    it('should extract waste classification, quantity, unit, and technology', () => {
      const text = 'Classe II A 1,95000 Tonelada Compostagem';

      const result = extractWasteClassificationData(text);

      expect(result).toEqual([
        {
          classification: 'Classe II A',
          quantity: 1.95,
          technology: 'Compostagem',
          unit: 'Tonelada',
        },
      ]);
    });

    it('should extract multiple waste data entries', () => {
      const text = [
        'Classe II A 1,95000 Tonelada Compostagem',
        'Classe II A 3,50000 Tonelada Compostagem',
      ].join('\n');

      const result = extractWasteClassificationData(text);

      expect(result).toHaveLength(2);
      expect(result[0]?.quantity).toBe(1.95);
      expect(result[1]?.quantity).toBe(3.5);
    });

    it('should handle NaN quantity by defaulting to 0', () => {
      const text = 'Classe II A ... Tonelada Compostagem';

      const result = extractWasteClassificationData(text);

      if (result.length > 0) {
        expect(result[0]?.quantity).toBe(0);
      }
    });

    it('should return empty array when no waste data found', () => {
      expect(extractWasteClassificationData('No waste data here')).toEqual([]);
    });
  });

  describe('mergeWasteEntries', () => {
    it('should merge codes with data entries by index', () => {
      const codes: WasteCodeInfo[] = [
        { code: '040108', description: 'Residuos de couros' },
        { code: '020301', description: 'Lamas de lavagem' },
      ];
      const data: WasteDataInfo[] = [
        {
          classification: 'Classe II A',
          quantity: 1.95,
          technology: 'Compostagem',
          unit: 'Tonelada',
        },
        {
          classification: 'Classe II A',
          quantity: 3.5,
          technology: 'Compostagem',
          unit: 'Tonelada',
        },
      ];

      const result = mergeWasteEntries(codes, data);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        classification: 'Classe II A',
        code: '040108',
        description: 'Residuos de couros',
        quantity: 1.95,
        technology: 'Compostagem',
        unit: 'Tonelada',
      });
    });

    it('should handle more data entries than codes', () => {
      const codes: WasteCodeInfo[] = [];
      const data: WasteDataInfo[] = [
        {
          classification: 'Classe II A',
          quantity: 1.95,
          technology: 'Compostagem',
          unit: 'Tonelada',
        },
      ];

      const result = mergeWasteEntries(codes, data);

      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBeUndefined();
      expect(result[0]?.description).toBe('');
    });

    it('should handle more codes than data entries', () => {
      const codes: WasteCodeInfo[] = [
        { code: '040108', description: 'Residuos de couros' },
      ];
      const data: WasteDataInfo[] = [];

      const result = mergeWasteEntries(codes, data);

      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe('040108');
      expect(result[0]?.classification).toBeUndefined();
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
