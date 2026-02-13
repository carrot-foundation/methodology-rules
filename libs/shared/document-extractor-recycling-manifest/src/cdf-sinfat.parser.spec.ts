import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { CdfSinfatParser } from './cdf-sinfat.parser';

describe('CdfSinfatParser', () => {
  const parser = new CdfSinfatParser();

  beforeEach(() => {
    clearRegistry();
  });

  const validCdfText = [
    'Periodo: 01/02/2023 até 28/02/2023',
    'Certificado de Destinação Final CDF nº 2154920/2023',
    'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu',
    'os resíduos abaixo discriminados.',
    '',
    'Identificação do Gerador',
    'Razão Social: Laticínios Bela Vista LTDA CPF/CNPJ: 02.089.969/0035-55',
    'Endereço: Rua Empresário Agenello Senger, nº S/N Municipio: Carazinho UF: RS',
    '',
    'Identificação dos Resíduos',
    '1. 040108 - Resíduos de couros (aparas, resíduos de corte, pó de rebaixamento, pó de lixamento)',
    'Classe II A 1,95000 Tonelada Compostagem',
    '2. 020301 - Lamas de lavagem, limpeza, descasque, centrifugação e separação',
    'Classe II A 3,50000 Tonelada Compostagem',
    '',
    'Declaração',
    'Declaramos que os resíduos foram destinados conforme legislação ambiental vigente.',
    'Carazinho, 10/04/2023',
    '',
    'MTRs incluidos',
    '2302037916, 2302037795, 2302037801',
    'Nome do Responsável',
  ].join('\n');

  describe('parse', () => {
    it('should parse all fields from a valid CDF document', () => {
      const result = parser.parse(stubTextExtractionResult(validCdfText));

      expect(result.data.documentNumber.parsed).toBe('2154920/2023');
      expect(result.data.documentNumber.confidence).toBe('high');

      expect(result.data.recycler.name.parsed).toBe(
        'ECO ADUBOS ORGANICOS LTDA',
      );
      expect(result.data.recycler.taxId.parsed).toBe('13.843.890/0001-45');
      expect(result.data.recycler.name.confidence).toBe('high');

      expect(result.data.generator.name.parsed).toBe(
        'Laticinios Bela Vista LTDA',
      );
      expect(result.data.generator.taxId.parsed).toBe('02.089.969/0035-55');
      expect(result.data.generator.address.parsed).toBe(
        'Rua Empresario Agenello Senger, nº S/N',
      );
      expect(result.data.generator.city.parsed).toBe('Carazinho');
      expect(result.data.generator.state.parsed).toBe('RS');
      expect(result.data.generator.name.confidence).toBe('high');

      expect(result.data.issueDate.parsed).toBe('10/04/2023');
      expect(result.data.issueDate.confidence).toBe('high');

      expect(result.data.processingPeriod?.parsed).toBe(
        '01/02/2023 ate 28/02/2023',
      );

      expect(result.data.documentType).toBe('recyclingManifest');
      expect(result.reviewRequired).toBe(false);
    });

    it('should extract waste entries with code, classification, quantity, unit, and technology', () => {
      const result = parser.parse(stubTextExtractionResult(validCdfText));

      expect(result.data.wasteEntries?.parsed).toHaveLength(2);

      const firstEntry = result.data.wasteEntries?.parsed[0];

      expect(firstEntry?.code).toBe('040108');
      expect(firstEntry?.classification).toBe('Classe II A');
      expect(firstEntry?.quantity).toBe(1.95);
      expect(firstEntry?.unit).toBe('Tonelada');
      expect(firstEntry?.technology).toBe('Compostagem');

      const secondEntry = result.data.wasteEntries?.parsed[1];

      expect(secondEntry?.code).toBe('020301');
      expect(secondEntry?.quantity).toBe(3.5);
    });

    it('should extract transport manifest numbers', () => {
      const result = parser.parse(stubTextExtractionResult(validCdfText));

      expect(result.data.transportManifests?.parsed).toEqual([
        '2302037916',
        '2302037795',
        '2302037801',
      ]);
    });

    it('should set low confidence when recycler preamble is missing', () => {
      const noRecyclerText = [
        'Certificado de Destinação Final CDF nº 100/2023',
        'Identificação do Gerador',
        'Razão Social: Some Company LTDA CPF/CNPJ: 02.089.969/0035-55',
        'Declaração',
        'Carazinho, 10/04/2023',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noRecyclerText));

      expect(result.data.recycler.name.confidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should set low confidence when generator section is missing', () => {
      const noGeneratorText = [
        'Certificado de Destinação Final CDF nº 100/2023',
        'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu',
        'Declaração',
        'Carazinho, 10/04/2023',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noGeneratorText));

      expect(result.data.generator.name.confidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteCdfText = [
        'Certificado de Destinação Final',
        'Some random text without useful data',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(incompleteCdfText));

      expect(result.reviewRequired).toBe(true);
      expect(result.data.missingRequiredFields).toContain('documentNumber');
      expect(result.data.missingRequiredFields).toContain('issueDate');
    });

    it('should handle CDF number variations', () => {
      const variations = [
        { expected: '2154920/2023', text: 'CDF nº 2154920/2023' },
        { expected: '100/2023', text: 'CDF n° 100/2023' },
        { expected: '12345', text: 'CDF: 12345' },
      ];

      for (const { expected, text } of variations) {
        const fullText = `${text}\nDeclaração\n01/01/2024`;
        const result = parser.parse(stubTextExtractionResult(fullText));

        expect(result.data.documentNumber.parsed).toBe(expected);
      }
    });

    it('should extract issue date from Declaração section', () => {
      const text = [
        'CDF nº 100/2023',
        'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu',
        'Identificação do Gerador',
        'Razão Social: Company LTDA CPF/CNPJ: 02.089.969/0035-55',
        'Declaração',
        'Declaramos que os resíduos foram destinados.',
        'Carazinho, 15/06/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.issueDate.parsed).toBe('15/06/2024');
    });

    it('should extract processing period range', () => {
      const text = [
        'CDF nº 100/2023',
        'Periodo: 01/01/2024 até 31/03/2024',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.processingPeriod?.parsed).toBe(
        '01/01/2024 ate 31/03/2024',
      );
    });

    it('should not extract waste entries when none are present', () => {
      const noWasteText = [
        'CDF nº 100/2023',
        'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noWasteText));

      expect(result.data.wasteEntries).toBeUndefined();
    });

    it('should not extract transport manifests when section is missing', () => {
      const noMtrText = [
        'CDF nº 100/2023',
        'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noMtrText));

      expect(result.data.transportManifests).toBeUndefined();
    });

    it('should extract environmental license', () => {
      const text = [
        'CDF nº 100/2023',
        'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu',
        'Licença Ambiental: LO-12345/2024',
        'Identificação do Gerador',
        'Razão Social: Company LTDA CPF/CNPJ: 02.089.969/0035-55',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.environmentalLicense?.parsed).toBe('LO-12345/2024');
    });

    it('should handle waste entry with more data rows than code rows', () => {
      const text = [
        'CDF nº 100/2023',
        'Classe II A 1,95000 Tonelada Compostagem',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.wasteEntries?.parsed).toHaveLength(1);
      expect(result.data.wasteEntries?.parsed[0]?.code).toBeUndefined();
      expect(result.data.wasteEntries?.parsed[0]?.description).toBe('');
      expect(result.data.wasteEntries?.parsed[0]?.classification).toBe(
        'Classe II A',
      );
    });

    it('should handle waste quantity with NaN value', () => {
      const text = [
        'CDF nº 100/2023',
        'Classe II A ... Tonelada Compostagem',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      if (result.data.wasteEntries) {
        expect(result.data.wasteEntries.parsed[0]?.quantity).toBe(0);
      }
    });

    it('should extract generator without address', () => {
      const text = [
        'CDF nº 100/2023',
        'ECO ADUBOS ORGANICOS LTDA, CPF/CNPJ 13.843.890/0001-45 certifica que recebeu',
        'Identificação do Gerador',
        'Razão Social: Company LTDA CPF/CNPJ: 02.089.969/0035-55',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator.name.parsed).toBe('Company LTDA');
      expect(result.data.generator.address.parsed).toBe('');
      expect(result.data.generator.address.confidence).toBe('low');
      expect(result.data.generator.city.parsed).toBe('');
      expect(result.data.generator.city.confidence).toBe('low');
      expect(result.data.generator.state.parsed).toBe('');
      expect(result.data.generator.state.confidence).toBe('low');
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid CDF text', () => {
      const score = parser.getMatchScore(
        stubTextExtractionResult(validCdfText),
      );

      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for non-CDF text', () => {
      const irrelevantText = 'This is a random document with no CDF patterns';
      const score = parser.getMatchScore(
        stubTextExtractionResult(irrelevantText),
      );

      expect(score).toBeLessThan(0.3);
    });

    it('should return medium score for partial CDF text', () => {
      const partialCdfText = [
        'Certificado de Destinação',
        'Gerador',
        'Resíduo tratado',
      ].join('\n');
      const score = parser.getMatchScore(
        stubTextExtractionResult(partialCdfText),
      );

      expect(score).toBeGreaterThanOrEqual(0.1);
      expect(score).toBeLessThan(0.7);
    });
  });

  describe('metadata', () => {
    it('should have correct document type and layout id', () => {
      expect(parser.documentType).toBe('recyclingManifest');
      expect(parser.layoutId).toBe('cdf-sinfat');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
