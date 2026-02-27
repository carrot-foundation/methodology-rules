import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import {
  stubTextExtractionResult,
  stubTextExtractionResultWithBlocks,
} from '@carrot-fndn/shared/text-extractor';

import { CdfSinirParser } from './cdf-sinir.parser';

describe('CdfSinirParser', () => {
  const parser = new CdfSinirParser();

  beforeEach(() => {
    clearRegistry();
  });

  const sinirWasteHeaderBlocks = [
    {
      boundingBox: { height: 0.02, left: 0.05, top: 0.29, width: 0.05 },
      text: 'Residuo',
    },
    {
      boundingBox: { height: 0.02, left: 0.575, top: 0.29, width: 0.04 },
      text: 'Classe',
    },
    {
      boundingBox: { height: 0.02, left: 0.663, top: 0.29, width: 0.07 },
      text: 'Quantidade',
    },
    {
      boundingBox: { height: 0.02, left: 0.757, top: 0.29, width: 0.05 },
      text: 'Unidade',
    },
    {
      boundingBox: { height: 0.02, left: 0.858, top: 0.29, width: 0.07 },
      text: 'Tratamento',
    },
  ];

  const validSinirCdfText = [
    'CERTIFICADO DE DESTINAÇÃO FINAL',
    'CDF nº 3001234/2025',
    'Periodo: 01/04/2025 a 30/04/2025',
    'EMPRESA RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
    'os resíduos abaixo discriminados.',
    'Licença Ambiental: LO-1234/2024',
    '',
    'Razão Social:',
    'LATICÍNIOS BELA VISTA LTDA',
    'CPF/CNPJ:',
    '02089969003555',
    'Endereço: Rua Empresário Agenello Senger, nº S/N Municipio: Carazinho UF: RS',
    '',
    'Identificação dos Resíduos',
    '040108 - Resíduos de couros',
    'Classe II A 1,95000 Tonelada Tratamento',
    '020301 - Lamas de lavagem',
    'Classe II A 3,50000 Tonelada Compostagem',
    '',
    'Declaração',
    'Declaramos que os resíduos foram destinados.',
    'Carazinho, 10/05/2025',
    '',
    'Manifestos Incluídos:',
    '240001460711, 240001460712, 240001460713',
    'Nome do Responsável',
    '',
    'Sistema MTR do Sinir',
  ].join('\n');

  describe('parse', () => {
    it('should parse all fields from a valid SINIR CDF document', () => {
      const result = parser.parse(stubTextExtractionResult(validSinirCdfText));

      expect(result.data.documentNumber?.parsed).toBe('3001234/2025');
      expect(result.data.documentNumber?.confidence).toBe('high');

      expect(result.data.recycler?.name.parsed).toBe(
        'EMPRESA RECICLADORA LTDA',
      );
      expect(result.data.recycler?.taxId.parsed).toBe('13843890000145');
      expect(result.data.recycler?.name.confidence).toBe('high');

      expect(result.data.generator?.name.parsed).toBe(
        'LATICINIOS BELA VISTA LTDA',
      );
      expect(result.data.generator?.taxId.parsed).toBe('02089969003555');
      expect(result.data.generator?.name.confidence).toBe('high');

      expect(result.data.generator?.address.parsed).toBe(
        'Rua Empresario Agenello Senger, nº S/N',
      );
      expect(result.data.generator?.city.parsed).toBe('Carazinho');
      expect(result.data.generator?.state.parsed).toBe('RS');

      expect(result.data.issueDate?.parsed).toBe('10/05/2025');
      expect(result.data.issueDate?.confidence).toBe('high');

      expect(result.data.processingPeriod?.parsed).toBe(
        '01/04/2025 a 30/04/2025',
      );

      expect(result.data.environmentalLicense?.parsed).toBe('LO-1234/2024');

      expect(result.data.documentType).toBe('recyclingManifest');
      expect(result.reviewRequired).toBe(false);
    });

    it('should extract waste entries from blocks', () => {
      const result = parser.parse(
        stubTextExtractionResultWithBlocks(validSinirCdfText, [
          ...sinirWasteHeaderBlocks,
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.31, width: 0.3 },
            text: '040108 - Residuos de couros',
          },
          {
            boundingBox: { height: 0.02, left: 0.56, top: 0.31, width: 0.08 },
            text: 'Classe II A',
          },
          {
            boundingBox: { height: 0.02, left: 0.678, top: 0.31, width: 0.04 },
            text: '1,95000',
          },
          {
            boundingBox: { height: 0.02, left: 0.752, top: 0.31, width: 0.06 },
            text: 'Tonelada',
          },
          {
            boundingBox: { height: 0.02, left: 0.849, top: 0.31, width: 0.09 },
            text: 'Tratamento',
          },
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.33, width: 0.25 },
            text: '020301 - Lamas de lavagem',
          },
          {
            boundingBox: { height: 0.02, left: 0.56, top: 0.33, width: 0.08 },
            text: 'Classe II A',
          },
          {
            boundingBox: { height: 0.02, left: 0.678, top: 0.33, width: 0.04 },
            text: '3,50000',
          },
          {
            boundingBox: { height: 0.02, left: 0.752, top: 0.33, width: 0.06 },
            text: 'Tonelada',
          },
          {
            boundingBox: { height: 0.02, left: 0.849, top: 0.33, width: 0.09 },
            text: 'Compostagem',
          },
        ]),
      );

      expect(result.data.wasteEntries?.parsed).toHaveLength(2);

      const firstEntry = result.data.wasteEntries?.parsed[0];

      expect(firstEntry?.code).toBe('040108');
      expect(firstEntry?.classification).toBe('Classe II A');
      expect(firstEntry?.quantity).toBe(1.95);
      expect(firstEntry?.unit).toBe('Tonelada');

      const secondEntry = result.data.wasteEntries?.parsed[1];

      expect(secondEntry?.code).toBe('020301');
      expect(secondEntry?.quantity).toBe(3.5);
    });

    it('should extract 12-digit MTR numbers', () => {
      const result = parser.parse(stubTextExtractionResult(validSinirCdfText));

      expect(result.data.transportManifests?.parsed).toEqual([
        '240001460711',
        '240001460712',
        '240001460713',
      ]);
    });

    it('should handle unformatted 14-digit CNPJ for recycler', () => {
      const text = [
        'CDF nº 100/2023',
        'RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.recycler?.taxId.parsed).toBe('13843890000145');
    });

    it('should extract generator with separate-line labels', () => {
      const text = [
        'CDF nº 100/2023',
        'RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Razão Social:',
        'EMPRESA GERADORA LTDA',
        'CNPJ:',
        '12345678000190',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator?.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator?.taxId.parsed).toBe('12345678000190');
    });

    it('should extract generator with same-line labels and CNPJ/CPF format', () => {
      const text = [
        'CDF n° 2834634/2024',
        'Período : 20/03/2024 até 30/04/2024',
        'COMPOSTAMAIS LTDA., CPF/CNPJ 33545743000104 certifica que',
        'recebeu, em sua unidade de Araucária PR',
        'Identificação do Gerador',
        'Razão Social :Brasturinvest Investimentos Turistico SA',
        'CNPJ/CPF : 03422594000540',
        'Endereço :',
        'Comendador Araújo,499 Pestana Curitiba Hotel Centro',
        'Munícipio :',
        'Curitiba',
        'UF PR',
        'Identificação dos Resíduos',
        'Araucária, 06/05/2024',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator?.name.parsed).toBe(
        'Brasturinvest Investimentos Turistico SA',
      );
      expect(result.data.generator?.name.confidence).toBe('high');
      expect(result.data.generator?.taxId.parsed).toBe('03422594000540');
      expect(result.data.generator?.address.parsed).toBe(
        'Comendador Araujo,499 Pestana Curitiba Hotel Centro',
      );
      expect(result.data.generator?.city.parsed).toBe('Curitiba');
      expect(result.data.generator?.state.parsed).toBe('PR');
      expect(result.data.issueDate?.parsed).toBe('06/05/2024');
      expect(result.data.issueDate?.confidence).toBe('high');
    });

    it('should extract generator address from multi-line OCR layout', () => {
      const text = [
        'CDF n° 2834634/2024',
        'COMPOSTAMAIS LTDA., CPF/CNPJ 33545743000104 certifica que',
        'recebeu, em sua unidade de Araucária PR',
        'Razão Social :Empresa Geradora LTDA',
        'CNPJ/CPF : 03422594000540',
        'Endereço :',
        'Rua Santa Catarina, 1575 Guaíra',
        'Munícipio',
        'Curitiba',
        'UF PR',
        'Identificação dos Resíduos',
        'Declaração',
        'Araucária, 06/05/2024',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator?.address.parsed).toBe(
        'Rua Santa Catarina, 1575 Guaira',
      );
      expect(result.data.generator?.address.confidence).toBe('high');
      expect(result.data.generator?.city.parsed).toBe('Curitiba');
      expect(result.data.generator?.state.parsed).toBe('PR');
    });

    it('should extract issue date before Responsável when Declaração is absent', () => {
      const text = [
        'CDF nº 100/2023',
        'RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Araucária, 18/02/2025',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.issueDate?.parsed).toBe('18/02/2025');
      expect(result.data.issueDate?.confidence).toBe('high');
    });

    it('should set low confidence when recycler preamble is missing', () => {
      const noRecyclerText = [
        'CDF nº 100/2023',
        'Razão Social:',
        'Company LTDA',
        'CNPJ:',
        '02089969003555',
        'Declaração',
        'City, 10/04/2023',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noRecyclerText));

      expect(result.data.recycler?.name.confidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should set low confidence when generator section is missing', () => {
      const noGeneratorText = [
        'CDF nº 100/2023',
        'EMPRESA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Declaração',
        'City, 10/04/2023',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noGeneratorText));

      expect(result.data.generator?.name.confidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteCdfText = [
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'Some random text without useful data',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(incompleteCdfText));

      expect(result.reviewRequired).toBe(true);
    });

    it('should not extract waste entries when none are present', () => {
      const noWasteText = [
        'CDF nº 100/2023',
        'EMPRESA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noWasteText));

      expect(result.data.wasteEntries).toBeUndefined();
    });

    it('should not extract transport manifests when section is missing', () => {
      const noMtrText = [
        'CDF nº 100/2023',
        'EMPRESA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Declaração',
        'City, 01/04/2024',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noMtrText));

      expect(result.data.transportManifests).toBeUndefined();
    });

    it('should extract waste entries from bounding-box table when blocks are available', () => {
      const rawText = [
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'CDF n° 3661772/2025',
        'COMPOSTAMAIS LTDA., CPF/CNPJ 33545743000104 certifica que recebeu',
        'Identificação dos Resíduos',
        'Resíduo Classe Quantidade Unidade Tratamento',
        '200108 Resíduos biodegradáveis de cozinha e cantinas CLASSE II A 1,1200 Tonelada Compostagem',
        'Declaração',
        'Araucária, 18/02/2025',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          ...sinirWasteHeaderBlocks,
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.31, width: 0.34 },
            text: '200108 Residuos biodegradaveis de cozinha e cantinas',
          },
          {
            boundingBox: { height: 0.02, left: 0.56, top: 0.31, width: 0.08 },
            text: 'CLASSE II A',
          },
          {
            boundingBox: { height: 0.02, left: 0.678, top: 0.31, width: 0.04 },
            text: '1,1200',
          },
          {
            boundingBox: { height: 0.02, left: 0.752, top: 0.31, width: 0.06 },
            text: 'Tonelada',
          },
          {
            boundingBox: { height: 0.02, left: 0.849, top: 0.31, width: 0.09 },
            text: 'Compostagem',
          },
        ]),
      );

      expect(result.data.wasteEntries?.parsed).toHaveLength(1);

      const entry = result.data.wasteEntries?.parsed[0];

      expect(entry?.code).toBe('200108');
      expect(entry?.description).toBe(
        'Residuos biodegradaveis de cozinha e cantinas',
      );
      expect(entry?.classification).toBe('CLASSE II A');
      expect(entry?.quantity).toBe(1.12);
      expect(entry?.unit).toBe('Tonelada');
      expect(entry?.technology).toBe('Compostagem');
      expect(result.data.wasteEntries?.confidence).toBe('high');
    });

    it('should extract multiple waste entries from bounding-box table', () => {
      const rawText = [
        'CERTIFICADO DE DESTINAÇÃO FINAL',
        'CDF n° 100/2025',
        'RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Identificação dos Resíduos',
        'Resíduo Classe Quantidade Unidade Tratamento',
        '040108 Resíduos de couros CLASSE II A 1,9500 Tonelada Tratamento',
        '020301 Lamas de lavagem CLASSE II A 3,5000 Tonelada Compostagem',
        'Declaração',
        'City, 10/05/2025',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          ...sinirWasteHeaderBlocks,
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.31, width: 0.25 },
            text: '040108 Residuos de couros',
          },
          {
            boundingBox: { height: 0.02, left: 0.56, top: 0.31, width: 0.08 },
            text: 'CLASSE II A',
          },
          {
            boundingBox: { height: 0.02, left: 0.678, top: 0.31, width: 0.04 },
            text: '1,9500',
          },
          {
            boundingBox: { height: 0.02, left: 0.752, top: 0.31, width: 0.06 },
            text: 'Tonelada',
          },
          {
            boundingBox: { height: 0.02, left: 0.849, top: 0.31, width: 0.09 },
            text: 'Tratamento',
          },
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.33, width: 0.22 },
            text: '020301 Lamas de lavagem',
          },
          {
            boundingBox: { height: 0.02, left: 0.56, top: 0.33, width: 0.08 },
            text: 'CLASSE II A',
          },
          {
            boundingBox: { height: 0.02, left: 0.678, top: 0.33, width: 0.04 },
            text: '3,5000',
          },
          {
            boundingBox: { height: 0.02, left: 0.752, top: 0.33, width: 0.06 },
            text: 'Tonelada',
          },
          {
            boundingBox: { height: 0.02, left: 0.849, top: 0.33, width: 0.09 },
            text: 'Compostagem',
          },
        ]),
      );

      expect(result.data.wasteEntries?.parsed).toHaveLength(2);

      const first = result.data.wasteEntries?.parsed[0];

      expect(first?.code).toBe('040108');
      expect(first?.description).toBe('Residuos de couros');
      expect(first?.quantity).toBe(1.95);

      const second = result.data.wasteEntries?.parsed[1];

      expect(second?.code).toBe('020301');
      expect(second?.description).toBe('Lamas de lavagem');
      expect(second?.quantity).toBe(3.5);
    });

    it('should skip rows with non-code residuo text in bounding-box table', () => {
      const rawText = [
        'CDF n° 100/2025',
        'RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Resíduo Classe Quantidade Unidade Tratamento',
        'random text',
        'Declaração',
        'City, 07/02/2025',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          ...sinirWasteHeaderBlocks,
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.31, width: 0.15 },
            text: 'random text',
          },
        ]),
      );

      expect(result.data.wasteEntries).toBeUndefined();
    });

    it('should extract waste entry from blocks without quantity columns', () => {
      const rawText = [
        'CDF n° 100/2025',
        'RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Resíduo Classe Quantidade Unidade Tratamento',
        '200108 Resíduos biodegradáveis',
        'Declaração',
        'City, 07/02/2025',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          ...sinirWasteHeaderBlocks,
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.31, width: 0.3 },
            text: '200108 Residuos biodegradaveis',
          },
        ]),
      );

      expect(result.data.wasteEntries?.parsed).toHaveLength(1);

      const entry = result.data.wasteEntries?.parsed[0];

      expect(entry?.code).toBe('200108');
      expect(entry?.description).toBe('Residuos biodegradaveis');
      expect(entry?.classification).toBeUndefined();
      expect(entry?.quantity).toBeUndefined();
      expect(entry?.unit).toBeUndefined();
      expect(entry?.technology).toBeUndefined();
    });

    it('should handle waste code without dash in bounding-box table', () => {
      const rawText = [
        'CDF n° 100/2025',
        'RECICLADORA LTDA, CPF/CNPJ 13843890000145 certifica que recebeu',
        'Resíduo Classe Quantidade Unidade Tratamento',
        '200108 Resíduos biodegradáveis CLASSE II A 3,0912 Tonelada Compostagem',
        'Declaração',
        'City, 07/02/2025',
        'Responsável',
        'Sistema MTR do Sinir',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          ...sinirWasteHeaderBlocks,
          {
            boundingBox: { height: 0.02, left: 0.05, top: 0.31, width: 0.3 },
            text: '200108 Residuos biodegradaveis',
          },
          {
            boundingBox: { height: 0.02, left: 0.56, top: 0.31, width: 0.08 },
            text: 'CLASSE II A',
          },
          {
            boundingBox: { height: 0.02, left: 0.678, top: 0.31, width: 0.04 },
            text: '3,0912',
          },
          {
            boundingBox: { height: 0.02, left: 0.752, top: 0.31, width: 0.06 },
            text: 'Tonelada',
          },
          {
            boundingBox: { height: 0.02, left: 0.849, top: 0.31, width: 0.09 },
            text: 'Compostagem',
          },
        ]),
      );

      expect(result.data.wasteEntries?.parsed).toHaveLength(1);

      const entry = result.data.wasteEntries?.parsed[0];

      expect(entry?.code).toBe('200108');
      expect(entry?.description).toBe('Residuos biodegradaveis');
      expect(entry?.quantity).toBe(3.0912);
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid SINIR CDF text', () => {
      const score = parser.getMatchScore(
        stubTextExtractionResult(validSinirCdfText),
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
  });

  describe('metadata', () => {
    it('should have correct document type and layout id', () => {
      expect(parser.documentType).toBe('recyclingManifest');
      expect(parser.layoutId).toBe('cdf-sinir');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
