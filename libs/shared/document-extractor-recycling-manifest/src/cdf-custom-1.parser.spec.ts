import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { CdfCustom1Parser } from './cdf-custom-1.parser';

describe('CdfCustom1Parser', () => {
  const parser = new CdfCustom1Parser();

  beforeEach(() => {
    clearRegistry();
  });

  type TextBlock = TextExtractionResult['blocks'][number];

  const makeBlock = (text: string, left: number, top: number): TextBlock => ({
    blockType: 'LINE',
    boundingBox: { height: 0.015, left, top, width: 0.2 },
    id: `${text}-${top}`,
    text,
  });

  // Table header blocks (from real Textract - note Data header is slightly higher)
  const CDF_TABLE_HEADER_BLOCKS: TextBlock[] = [
    makeBlock('Data de recebimento da', 0.331, 0.508),
    makeBlock('Tipo de Matéria-Prima', 0.071, 0.515),
    makeBlock('CADRI', 0.27, 0.515),
    makeBlock('Quantidade Recebida (ton)', 0.625, 0.515),
  ];

  // Helper to build a receipt row (3 blocks per row)
  const makeReceiptRow = (
    wasteType: string,
    date: string,
    quantity: string,
    top: number,
    cadri?: string,
  ): TextBlock[] => [
    makeBlock(wasteType, 0.066, top),
    ...(cadri ? [makeBlock(cadri, 0.27, top + 0.001)] : []),
    makeBlock(date, 0.388, top + 0.001),
    makeBlock(quantity, 0.716, top + 0.001),
  ];

  // Preamble blocks (generator, recycler, etc.) needed for parser to extract other fields
  const CDF_PREAMBLE_BLOCKS: TextBlock[] = [
    makeBlock('CDF 50193/24', 0.06, 0.05),
    makeBlock('Jundiaí, 07 de Agosto de 2024.', 0.06, 0.1),
    makeBlock('Empresa Recebedora: Tera Ambiental Ltda.', 0.06, 0.2),
    makeBlock('CNPJ: 59.591.115/0003-02 IE: 407.275.597.112', 0.06, 0.22),
    makeBlock('Empresa Geradora: AJINOMOTO DO BRASIL', 0.06, 0.3),
    makeBlock('CNPJ: 46.344.354/0005-88 IE: 417325212115', 0.06, 0.32),
  ];

  const validCustomCdfText = [
    'Tera Ambiental Ltda',
    'Rua Paulino Corado, 20 - Sala 603 Jardim Santa Teresa, Jundiaí - SP',
    'CDF 50193/24',
    'Jundiaí, 07 de Agosto de 2024.',
    'CERTIFICADO DE DESTINAÇÃO FINAL',
    'N°50193/24',
    'Informamos que a Tera Ambiental Ltda, com sede em Jundiaí, no estado de São Paulo,',
    'inscrita no CNPJ: 59.591.115/0003-02, através da compostagem de lodo de esgoto,',
    'certifica que as matérias-primas abaixo discriminados da empresa AJINOMOTO DO BRASIL',
    'no período abaixo identificado foram recebidas e tratadas em',
    'conformidade com a licença nº: 36013428 de 25/06/2024.',
    'Empresa Recebedora: Tera Ambiental Ltda.',
    'Endereço: Estrada Municipal do Varjão, 4.520',
    'Cadastro na Cetesb: 407-0361098',
    'CNPJ: 59.591.115/0003-02 IE: 407.275.597.112',
    'Empresa Geradora: AJINOMOTO DO BRASIL INDÚSTRIA E COMÉRCIO DE ALIMENTOS LTDA.',
    'Endereço: RODOVIA ANHANGUERA (SP 330) KM 131',
    'CNPJ: 46.344.354/0005-88 IE: 417325212115',
    'LODO SÓLIDO - SANITÁRIO: LODO GERADO NA ESTAÇÃO DE TRATAMENTO DE ÁGUA',
    'Descrição: Tipo de Matéria-Prima CADRI Data do Recebimento Quantidade (ton)',
    'LODO SÓLIDO - SANITÁRIO 42003189 01/07/2024 85,12',
    'LODO SÓLIDO - SANITÁRIO 42003189 02/07/2024 90,50',
    'LODO SÓLIDO - SANITÁRIO 42003189 15/07/2024 201,97',
    'Quantidade Tratada de LODO SÓLIDO - SANITÁRIO 377,59',
    'Quantidade Total Tratado',
    '377,59',
  ].join('\n');

  describe('parse', () => {
    it('should parse a valid custom CDF document with high confidence', () => {
      const result = parser.parse(stubTextExtractionResult(validCustomCdfText));

      expect(result.data.documentNumber?.parsed).toBe('50193/24');
      expect(result.data.documentNumber?.confidence).toBe('high');
      expect(result.data.issueDate?.parsed).toBe('07/08/2024');
      expect(result.data.issueDate?.confidence).toBe('high');
      expect(result.data.recycler?.name.parsed).toBe('Tera Ambiental Ltda.');
      expect(result.data.recycler?.taxId.parsed).toBe('59.591.115/0003-02');
      expect(result.data.recycler?.name.confidence).toBe('high');
      expect(result.data.generator?.name.parsed).toBe(
        'AJINOMOTO DO BRASIL INDUSTRIA E COMERCIO DE ALIMENTOS LTDA.',
      );
      expect(result.data.generator?.taxId.parsed).toBe('46.344.354/0005-88');
      expect(result.data.generator?.name.confidence).toBe('high');
      expect(result.data.environmentalLicense?.parsed).toBe('36013428');
      expect(result.data.treatmentMethod?.parsed).toBe(
        'compostagem de lodo de esgoto',
      );
      expect(result.data.wasteEntries?.parsed).toEqual([
        {
          description: 'LODO GERADO NA ESTACAO DE TRATAMENTO DE AGUA',
          quantity: 377.59,
          unit: 'ton',
        },
      ]);
      expect(result.data.documentType).toBe('recyclingManifest');
      expect(result.data.generator?.address.confidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
      expect(result.data.lowConfidenceFields).toEqual(
        expect.arrayContaining([
          'generator.address',
          'generator.city',
          'generator.state',
        ]),
      );
    });

    it('should extract generator address when Endereço line has city/state format', () => {
      const text = [
        'CDF 31014/21',
        'Jundiaí, 10 de Fevereiro de 2021.',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'N°31014/21',
        'certifica que as matérias-primas',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'Endereço: Estrada Municipal do Varjão, 4.520 Bairro Varjão Jundiaí/SP CEP: 13212-590',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: COMPANHIA SANEAMENTO DE JUNDIAI',
        'Endereço: ESTRADA MUNICIPAL DO VARJÃO, 4.520 JD. NOVO HORIZONTE, JUNDIAI /SP CEP: 13212-590',
        'CNPJ: 01.201.289/0001-70 IE: ISENTO',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
        'Quantidade Total Tratado',
        '2.606,23',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator?.name.parsed).toBe(
        'COMPANHIA SANEAMENTO DE JUNDIAI',
      );
      expect(result.data.generator?.taxId.parsed).toBe('01.201.289/0001-70');
      expect(result.data.generator?.address.parsed).toBe(
        'ESTRADA MUNICIPAL DO VARJAO, 4.520 JD. NOVO HORIZONTE',
      );
      expect(result.data.generator?.city.parsed).toBe('JUNDIAI');
      expect(result.data.generator?.state.parsed).toBe('SP');
      expect(result.data.generator?.address.confidence).toBe('high');
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteText = [
        'Tera Ambiental Ltda',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Empresa Recebedora: Some Company',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(incompleteText));

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons.length).toBeGreaterThan(0);
    });

    it('should set low confidence for entities with missing CNPJ', () => {
      const noCnpjText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Empresa Recebedora: Company Without CNPJ',
        'Empresa Geradora: Generator Without CNPJ',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
        'Quantidade Total Tratado',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noCnpjText));

      expect(result.data.recycler?.name.confidence).toBe('low');
      expect(result.data.generator?.name.confidence).toBe('low');
      expect(result.data.extractionConfidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should handle document number variations', () => {
      const variations = [
        { expected: '50193/24', text: 'CDF 50193/24' },
        { expected: '50193/24', text: 'N°50193/24' },
        { expected: '12345/2024', text: 'CDF 12345/2024' },
      ];

      for (const { expected, text } of variations) {
        const fullText = `${text}\nJundiaí, 01 de Janeiro de 2024.`;
        const result = parser.parse(stubTextExtractionResult(fullText));

        expect(result.data.documentNumber?.parsed).toBe(expected);
      }
    });

    it('should parse long-format Brazilian dates with various months', () => {
      const months = [
        { expected: '01', name: 'Janeiro' },
        { expected: '03', name: 'Março' },
        { expected: '07', name: 'Julho' },
        { expected: '12', name: 'Dezembro' },
      ];

      for (const { expected, name } of months) {
        const text = `CDF 100/24\nCity, 15 de ${name} de 2024.`;
        const result = parser.parse(stubTextExtractionResult(text));

        expect(result.data.issueDate?.parsed).toBe(`15/${expected}/2024`);
      }
    });

    it('should not extract issue date for invalid month name', () => {
      const invalidMonthText = [
        'CDF 100/24',
        'City, 15 de InvalidMonth de 2024.',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(invalidMonthText));

      expect(result.data.issueDate).toBeUndefined();
    });

    it('should extract environmental license from preamble text', () => {
      const licenseText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'conformidade com a licença nº: 36013428 de 25/06/2024.',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(licenseText));

      expect(result.data.environmentalLicense?.parsed).toBe('36013428');
    });

    it('should extract treatment method from preamble text', () => {
      const treatmentText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'através da compostagem de lodo de esgoto, certifica que',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(treatmentText));

      expect(result.data.treatmentMethod?.parsed).toBe(
        'compostagem de lodo de esgoto',
      );
    });

    it('should handle waste quantity in Brazilian number format', () => {
      const quantityText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'Quantidade Total Tratado',
        '1.377,59',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(quantityText));

      expect(result.data.wasteEntries?.parsed[0]?.quantity).toBe(1377.59);
    });

    it('should not extract waste quantity when value is NaN', () => {
      const nanQuantityText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'Quantidade Total Tratado',
        '...',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(nanQuantityText));

      expect(result.data.wasteEntries).toBeUndefined();
    });

    it('should handle entity with short name after label', () => {
      const shortNameText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'Empresa Recebedora: AB',
        'CNPJ: 59.591.115/0003-02',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(shortNameText));

      expect(result.data.recycler?.name.confidence).toBe('low');
    });

    it('should handle quantity on the same line as label (fallback)', () => {
      const sameLineText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'Quantidade Total Tratado 500,00',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(sameLineText));

      expect(result.data.wasteEntries?.parsed[0]?.quantity).toBe(500);
    });

    it('should extract receipt table entries', () => {
      const result = parser.parse(stubTextExtractionResult(validCustomCdfText));

      expect(result.data.receiptEntries?.parsed).toHaveLength(3);
      expect(result.data.receiptEntries?.confidence).toBe('high');
      expect(result.data.receiptEntries?.parsed[0]).toEqual({
        cadri: '42003189',
        quantity: 85.12,
        receiptDate: '01/07/2024',
        wasteType: 'LODO SOLIDO - SANITARIO',
      });
    });

    it('should extract CADRI as transport manifests', () => {
      const result = parser.parse(stubTextExtractionResult(validCustomCdfText));

      expect(result.data.transportManifests?.parsed).toEqual(['42003189']);
      expect(result.data.transportManifests?.confidence).toBe('high');
    });

    it('should not extract transport manifests when all CADRIs are dashes', () => {
      const noCadriText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'CNPJ: 59.591.115/0003-02 IE: 407275597112',
        'CNPJ: 46.344.354/0005-88 IE: 417325212115',
        'LODO SÓLIDO - SANITÁRIO: LODO DE ETE',
        'Descrição: Tipo de Matéria-Prima CADRI',
        'LODO SÓLIDO - SANITÁRIO - 01/07/2024 85,12',
        'Quantidade Tratada de LODO SÓLIDO - SANITÁRIO 85,12',
        'Quantidade Total Tratado',
        '85,12',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: Generator LTDA',
        'CNPJ: 46.344.354/0005-88',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noCadriText));

      expect(result.data.receiptEntries?.parsed).toHaveLength(1);
      expect(result.data.receiptEntries?.parsed[0]?.cadri).toBeUndefined();
      expect(result.data.transportManifests).toBeUndefined();
    });

    it('should derive processingPeriod from receipt table dates', () => {
      const result = parser.parse(stubTextExtractionResult(validCustomCdfText));

      expect(result.data.processingPeriod?.parsed).toBe(
        '01/07/2024 ate 15/07/2024',
      );
      expect(result.data.processingPeriod?.confidence).toBe('high');
    });

    it('should not set processingPeriod when no receipt table rows exist', () => {
      const noTableText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: Generator LTDA',
        'CNPJ: 46.344.354/0005-88',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
        'Quantidade Total Tratado',
        '1.234,56',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noTableText));

      expect(result.data.processingPeriod).toBeUndefined();
    });

    it('should not set processingPeriod when no rows match the receipt table pattern', () => {
      const invalidDatesText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'CNPJ: 59.591.115/0003-02 IE: 407275597112',
        'CNPJ: 46.344.354/0005-88 IE: 417325212115',
        'LODO SÓLIDO - SANITÁRIO: LODO DE ETE',
        'Descrição: Tipo de Matéria-Prima CADRI Data',
        'LODO SÓLIDO - SANITÁRIO - invalid-date 85,12',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: Generator LTDA',
        'CNPJ: 46.344.354/0005-88',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(invalidDatesText));

      expect(result.data.processingPeriod).toBeUndefined();
    });

    it('should skip receipt table rows with unparseable quantity', () => {
      const badQuantityText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'CNPJ: 59.591.115/0003-02 IE: 407275597112',
        'CNPJ: 46.344.354/0005-88 IE: 417325212115',
        'LODO SÓLIDO - SANITÁRIO: LODO DE ETE',
        'Descrição: Tipo de Matéria-Prima CADRI Data',
        'LODO SÓLIDO - SANITÁRIO 42003189 01/07/2024 ...',
        'LODO SÓLIDO - SANITÁRIO 42003189 02/07/2024 90,50',
        'Quantidade Tratada de LODO SÓLIDO - SANITÁRIO 90,50',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: Generator LTDA',
        'CNPJ: 46.344.354/0005-88',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(badQuantityText));

      expect(result.data.receiptEntries?.parsed).toHaveLength(1);
    });

    it('should skip waste subtotals with unparseable quantity', () => {
      const badSubtotalText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'Quantidade Tratada de LODO SOLIDO - SANITARIO ...',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: Generator LTDA',
        'CNPJ: 46.344.354/0005-88',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
        'Quantidade Total Tratado',
        '100,00',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(badSubtotalText));

      expect(result.data.wasteEntries?.parsed[0]?.quantity).toBe(100);
    });

    it('should not extract waste type descriptions when section markers are missing', () => {
      const noMarkersText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'LODO SÓLIDO - SANITÁRIO 42003189 01/07/2024 85,12',
        'Quantidade Tratada de LODO SÓLIDO - SANITÁRIO 85,12',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: Generator LTDA',
        'CNPJ: 46.344.354/0005-88',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noMarkersText));

      expect(result.data.wasteEntries?.parsed[0]?.description).toBe(
        'LODO SOLIDO - SANITARIO',
      );
    });

    it('should fall back to total quantity when no table rows or subtotals are present', () => {
      const fallbackText = [
        'CDF 100/24',
        'Jundiaí, 01 de Janeiro de 2024.',
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Empresa Recebedora: Tera Ambiental Ltda.',
        'CNPJ: 59.591.115/0003-02',
        'Empresa Geradora: Generator LTDA',
        'CNPJ: 46.344.354/0005-88',
        'Cadastro na Cetesb: 123',
        'CADRI',
        'matérias-primas',
        'Quantidade Total Tratado',
        '1.234,56',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(fallbackText));

      expect(result.data.receiptEntries).toBeUndefined();
      expect(result.data.wasteEntries?.parsed[0]?.quantity).toBe(1234.56);
      expect(result.data.wasteEntries?.parsed[0]?.description).toBe('');
    });

    it('should extract receipt entries from block-based table', () => {
      const blocks: TextBlock[] = [
        ...CDF_PREAMBLE_BLOCKS,
        ...CDF_TABLE_HEADER_BLOCKS,
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '01/07/2024',
          '85,12',
          0.539,
        ),
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '02/07/2024',
          '90,50',
          0.556,
        ),
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '15/07/2024',
          '201,97',
          0.575,
        ),
        makeBlock(
          'Quantidade Tratada de LODO SOLIDO - SANITARIO 377,59',
          0.09,
          0.6,
        ),
        makeBlock('Quantidade Total Tratado', 0.19, 0.62),
        makeBlock('377,59', 0.19, 0.635),
      ];

      const result = parser.parse({
        blocks,
        rawText: validCustomCdfText as NonEmptyString,
      });

      expect(result.data.receiptEntries?.parsed).toHaveLength(3);
      expect(result.data.receiptEntries?.confidence).toBe('high');
      expect(result.data.receiptEntries?.parsed[0]).toEqual({
        quantity: 85.12,
        receiptDate: '01/07/2024',
        wasteType: 'LODO SOLIDO - SANITARIO',
      });
      expect(result.data.processingPeriod?.parsed).toBe(
        '01/07/2024 ate 15/07/2024',
      );
      expect(result.data.processingPeriod?.confidence).toBe('high');
    });

    it('should extract receipt entries from multi-page block-based table', () => {
      // Page 1: rows with top 0.539–0.868; page 2: rows with top 0.018–0.036 (reset)
      const blocks: TextBlock[] = [
        ...CDF_PREAMBLE_BLOCKS,
        ...CDF_TABLE_HEADER_BLOCKS,
        // Page 1 rows
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '01/12/2024',
          '91,46',
          0.539,
        ),
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '18/12/2024',
          '98,59',
          0.85,
        ),
        // Page break marker (footer at bottom of page 1)
        makeBlock('Tera Ambiental Ltda', 0.435, 0.92),
        // Page 2 rows (top resets)
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '20/12/2024',
          '80,11',
          0.018,
        ),
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '31/12/2024',
          '79,79',
          0.036,
        ),
        makeBlock(
          'Quantidade Tratada de LODO SOLIDO - SANITARIO 350,00',
          0.09,
          0.22,
        ),
        makeBlock('Quantidade Total Tratado', 0.19, 0.24),
        makeBlock('350,00', 0.19, 0.255),
      ];

      const result = parser.parse({
        blocks,
        rawText: validCustomCdfText as NonEmptyString,
      });

      expect(result.data.receiptEntries?.parsed).toHaveLength(4);
      expect(result.data.processingPeriod?.parsed).toBe(
        '01/12/2024 ate 31/12/2024',
      );
    });

    it('should extract CADRI numbers when present in blocks', () => {
      const blocks: TextBlock[] = [
        ...CDF_PREAMBLE_BLOCKS,
        ...CDF_TABLE_HEADER_BLOCKS,
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '01/07/2024',
          '85,12',
          0.539,
          '42003189',
        ),
        ...makeReceiptRow(
          'LODO SOLIDO - SANITARIO',
          '02/07/2024',
          '90,50',
          0.556,
          '42003189',
        ),
        makeBlock('Quantidade Total Tratado', 0.19, 0.62),
        makeBlock('175,62', 0.19, 0.635),
      ];

      const result = parser.parse({
        blocks,
        rawText: validCustomCdfText as NonEmptyString,
      });

      expect(result.data.transportManifests?.parsed).toEqual(['42003189']);
      expect(result.data.receiptEntries?.parsed[0]?.cadri).toBe('42003189');
    });

    it('should skip block rows with invalid date format and fall back to regex', () => {
      const blocks: TextBlock[] = [
        ...CDF_PREAMBLE_BLOCKS,
        ...CDF_TABLE_HEADER_BLOCKS,
        // Row with invalid date format (not dd/mm/yyyy)
        makeBlock('LODO SOLIDO - SANITARIO', 0.066, 0.539),
        makeBlock('invalid-date', 0.388, 0.54),
        makeBlock('85,12', 0.716, 0.54),
        makeBlock('Quantidade Total Tratado', 0.19, 0.62),
        makeBlock('85,12', 0.19, 0.635),
      ];

      const result = parser.parse({
        blocks,
        rawText: validCustomCdfText as NonEmptyString,
      });

      // Block extraction yields 0 valid rows, falls back to regex on rawText
      expect(result.data.receiptEntries?.parsed).toHaveLength(3);
    });

    it('should skip block rows with unparseable quantity and fall back to regex', () => {
      const blocks: TextBlock[] = [
        ...CDF_PREAMBLE_BLOCKS,
        ...CDF_TABLE_HEADER_BLOCKS,
        // Row with unparseable quantity
        makeBlock('LODO SOLIDO - SANITARIO', 0.066, 0.539),
        makeBlock('01/07/2024', 0.388, 0.54),
        makeBlock('...', 0.716, 0.54),
        makeBlock('Quantidade Total Tratado', 0.19, 0.62),
        makeBlock('85,12', 0.19, 0.635),
      ];

      const result = parser.parse({
        blocks,
        rawText: validCustomCdfText as NonEmptyString,
      });

      // Block extraction yields 0 valid rows, falls back to regex on rawText
      expect(result.data.receiptEntries?.parsed).toHaveLength(3);
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid custom CDF text', () => {
      const score = parser.getMatchScore(
        stubTextExtractionResult(validCustomCdfText),
      );

      expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('should return low score for non-CDF text', () => {
      const irrelevantText = 'This is a random document with no CDF patterns';
      const score = parser.getMatchScore(
        stubTextExtractionResult(irrelevantText),
      );

      expect(score).toBeLessThan(0.3);
    });
  });

  describe('metadata', () => {
    it('should have correct document type and layout id', () => {
      expect(parser.documentType).toBe('recyclingManifest');
      expect(parser.layoutId).toBe('cdf-custom-1');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
