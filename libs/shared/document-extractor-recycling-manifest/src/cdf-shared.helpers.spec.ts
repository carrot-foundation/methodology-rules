import { clearRegistry } from '@carrot-fndn/shared/document-extractor';

import {
  buildWasteEntriesFromSubtotals,
  createRecyclerEntity,
  derivePeriodFromReceiptDates,
  extractCadriNumbers,
  extractMtrNumbers,
  extractRecyclerFromPreamble,
  extractWasteClassificationData,
  extractWasteSubtotals,
  extractWasteTypeDescriptions,
  finalizeCdfExtraction,
  mergeWasteEntries,
  parseReceiptTableRows,
  type ReceiptTableRow,
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

  describe('parseReceiptTableRows', () => {
    it('should parse rows with CADRI numbers', () => {
      const text = [
        'LODO SOLIDO - SANITARIO 42003189 01/07/2024 85,12',
        'LODO SOLIDO - SANITARIO 42003189 02/07/2024 90,50',
      ].join('\n');

      const result = parseReceiptTableRows(text);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        cadri: '42003189',
        quantity: 85.12,
        receiptDate: '01/07/2024',
        wasteType: 'LODO SOLIDO - SANITARIO',
      });
      expect(result[1]?.quantity).toBe(90.5);
    });

    it('should parse rows without CADRI (dash)', () => {
      const text = 'LODO SOLIDO - SANITARIO - 01/07/2024 85,12';

      const result = parseReceiptTableRows(text);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        quantity: 85.12,
        receiptDate: '01/07/2024',
        wasteType: 'LODO SOLIDO - SANITARIO',
      });
      expect(result[0]?.cadri).toBeUndefined();
    });

    it('should handle Brazilian number format with thousands separator', () => {
      const text = 'RESIDUO 12345678 15/08/2024 1.234,56';

      const result = parseReceiptTableRows(text);

      expect(result).toHaveLength(1);
      expect(result[0]?.quantity).toBe(1234.56);
    });

    it('should ignore subtotal and total lines', () => {
      const text = [
        'LODO SOLIDO - SANITARIO - 01/07/2024 85,12',
        'Subtotal LODO SOLIDO - SANITARIO 85,12',
        'Quantidade Total Tratado 85,12',
      ].join('\n');

      const result = parseReceiptTableRows(text);

      expect(result).toHaveLength(1);
    });

    it('should skip rows with unparseable quantity', () => {
      const text = 'RESIDUO - 01/07/2024 ...';

      expect(parseReceiptTableRows(text)).toEqual([]);
    });

    it('should return empty array for text without table rows', () => {
      const text = 'Some random text without any table data';

      expect(parseReceiptTableRows(text)).toEqual([]);
    });
  });

  describe('extractWasteTypeDescriptions', () => {
    it('should extract waste type descriptions from section between IE and table header', () => {
      const text = [
        'CNPJ: 46.344.354/0005-88 IE: 417325212115',
        'LODO SOLIDO - SANITARIO: LODO DE ETE (TORTA)',
        'Descricao: Tipo de Materia-Prima',
      ].join('\n');

      const result = extractWasteTypeDescriptions(text);

      expect(result).toEqual([
        {
          description: 'LODO DE ETE (TORTA)',
          wasteType: 'LODO SOLIDO - SANITARIO',
        },
      ]);
    });

    it('should extract multiple waste type descriptions', () => {
      const text = [
        'IE: 417325212115',
        'LODO SOLIDO - SANITARIO: LODO DE ETE (TORTA)',
        'OUTROS RESIDUOS: RESIDUO DO FLOTADOR (GORDURA)',
        'Tipo de Materia-Prima: whatever',
      ].join('\n');

      const result = extractWasteTypeDescriptions(text);

      expect(result).toHaveLength(2);
      expect(result[0]?.description).toBe('LODO DE ETE (TORTA)');
      expect(result[1]?.description).toBe('RESIDUO DO FLOTADOR (GORDURA)');
    });

    it('should return empty when section markers are missing', () => {
      const text = 'Some text without IE or Descricao markers';

      expect(extractWasteTypeDescriptions(text)).toEqual([]);
    });
  });

  describe('extractWasteSubtotals', () => {
    it('should extract single subtotal', () => {
      const text = 'Quantidade Tratada de LODO SOLIDO - SANITARIO 2.538,34';

      const result = extractWasteSubtotals(text);

      expect(result).toEqual([
        {
          quantity: 2538.34,
          wasteType: 'LODO SOLIDO - SANITARIO',
        },
      ]);
    });

    it('should extract multiple subtotals', () => {
      const text = [
        'Quantidade Tratada de LODO SOLIDO - SANITARIO 2.538,34',
        'Quantidade Tratada de OUTROS RESIDUOS 17,12',
      ].join('\n');

      const result = extractWasteSubtotals(text);

      expect(result).toHaveLength(2);
      expect(result[0]?.wasteType).toBe('LODO SOLIDO - SANITARIO');
      expect(result[1]?.wasteType).toBe('OUTROS RESIDUOS');
      expect(result[1]?.quantity).toBe(17.12);
    });

    it('should skip subtotals with unparseable quantity', () => {
      const text = 'Quantidade Tratada de TIPO ...';

      expect(extractWasteSubtotals(text)).toEqual([]);
    });

    it('should return empty array when no subtotals found', () => {
      expect(extractWasteSubtotals('No subtotals here')).toEqual([]);
    });
  });

  describe('buildWasteEntriesFromSubtotals', () => {
    it('should build waste entries with descriptions from mapping', () => {
      const subtotals = [
        { quantity: 2538.34, wasteType: 'LODO SOLIDO - SANITARIO' },
      ];
      const descriptions = [
        {
          description: 'LODO DE ETE (TORTA)',
          wasteType: 'LODO SOLIDO - SANITARIO',
        },
      ];

      const result = buildWasteEntriesFromSubtotals(subtotals, descriptions);

      expect(result).toEqual([
        {
          description: 'LODO DE ETE (TORTA)',
          quantity: 2538.34,
          unit: 'ton',
        },
      ]);
    });

    it('should fall back to waste type name when no description found', () => {
      const subtotals = [{ quantity: 100, wasteType: 'UNKNOWN TYPE' }];

      const result = buildWasteEntriesFromSubtotals(subtotals, []);

      expect(result[0]?.description).toBe('UNKNOWN TYPE');
    });

    it('should match descriptions case-insensitively', () => {
      const subtotals = [
        { quantity: 10, wasteType: 'lodo solido - sanitario' },
      ];
      const descriptions = [
        {
          description: 'LODO DE ETE',
          wasteType: 'LODO SOLIDO - SANITARIO',
        },
      ];

      const result = buildWasteEntriesFromSubtotals(subtotals, descriptions);

      expect(result[0]?.description).toBe('LODO DE ETE');
    });
  });

  describe('extractCadriNumbers', () => {
    it('should extract unique CADRI numbers', () => {
      const rows: ReceiptTableRow[] = [
        {
          cadri: '42003189',
          quantity: 85,
          receiptDate: '01/07/2024',
          wasteType: 'LODO',
        },
        {
          cadri: '42003189',
          quantity: 90,
          receiptDate: '02/07/2024',
          wasteType: 'LODO',
        },
        {
          cadri: '42003200',
          quantity: 50,
          receiptDate: '03/07/2024',
          wasteType: 'LODO',
        },
      ];

      const result = extractCadriNumbers(rows);

      expect(result).toEqual(['42003189', '42003200']);
    });

    it('should return empty array when all rows have no CADRI', () => {
      const rows: ReceiptTableRow[] = [
        {
          quantity: 85,
          receiptDate: '01/07/2024',
          wasteType: 'LODO',
        },
      ];

      expect(extractCadriNumbers(rows)).toEqual([]);
    });
  });

  describe('derivePeriodFromReceiptDates', () => {
    it('should derive period from multiple receipt dates', () => {
      const rows: ReceiptTableRow[] = [
        { quantity: 85, receiptDate: '15/07/2024', wasteType: 'LODO' },
        { quantity: 90, receiptDate: '01/07/2024', wasteType: 'LODO' },
        { quantity: 50, receiptDate: '28/07/2024', wasteType: 'LODO' },
      ];

      const result = derivePeriodFromReceiptDates(rows);

      expect(result).toBe('01/07/2024 ate 28/07/2024');
    });

    it('should return single date range when only one row exists', () => {
      const rows: ReceiptTableRow[] = [
        { quantity: 85, receiptDate: '15/07/2024', wasteType: 'LODO' },
      ];

      const result = derivePeriodFromReceiptDates(rows);

      expect(result).toBe('15/07/2024 ate 15/07/2024');
    });

    it('should return undefined when rows array is empty', () => {
      expect(derivePeriodFromReceiptDates([])).toBeUndefined();
    });

    it('should handle dates spanning multiple months', () => {
      const rows: ReceiptTableRow[] = [
        { quantity: 10, receiptDate: '28/01/2024', wasteType: 'LODO' },
        { quantity: 20, receiptDate: '15/02/2024', wasteType: 'LODO' },
        { quantity: 30, receiptDate: '01/03/2024', wasteType: 'LODO' },
      ];

      const result = derivePeriodFromReceiptDates(rows);

      expect(result).toBe('28/01/2024 ate 01/03/2024');
    });

    it('should skip rows with unparseable dates', () => {
      const rows: ReceiptTableRow[] = [
        { quantity: 10, receiptDate: '15/07/2024', wasteType: 'LODO' },
        { quantity: 20, receiptDate: 'invalid', wasteType: 'LODO' },
        { quantity: 30, receiptDate: '28/07/2024', wasteType: 'LODO' },
      ];

      const result = derivePeriodFromReceiptDates(rows);

      expect(result).toBe('15/07/2024 ate 28/07/2024');
    });

    it('should return undefined when all dates are unparseable', () => {
      const rows: ReceiptTableRow[] = [
        { quantity: 10, receiptDate: 'invalid', wasteType: 'LODO' },
        { quantity: 20, receiptDate: 'bad-date', wasteType: 'LODO' },
      ];

      expect(derivePeriodFromReceiptDates(rows)).toBeUndefined();
    });
  });

  describe('finalizeCdfExtraction', () => {
    it('should return extraction output with review required when fields are missing', () => {
      const result = finalizeCdfExtraction(
        {
          documentType: 'recyclingManifest',
          rawText: 'test' as never,
        },
        0.5,
        'test',
      );

      expect(result.data.documentType).toBe('recyclingManifest');
      expect(result.reviewRequired).toBe(true);
      expect(result.data.missingRequiredFields.length).toBeGreaterThan(0);
    });
  });
});
