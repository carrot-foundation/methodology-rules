import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import {
  stubTextExtractionResult,
  stubTextExtractionResultWithBlocks,
} from '@carrot-fndn/shared/text-extractor';

import { toWasteTypeEntryData } from './mtr-shared.helpers';
import { MtrSinfatParser } from './mtr-sinfat.parser';

describe('MtrSinfatParser', () => {
  const parser = new MtrSinfatParser();

  beforeEach(() => {
    clearRegistry();
  });

  const validSinfatText = `Manifesto de Transporte de Resíduos
Fundação Estadual de Proteção Ambiental
MTR nº 0124048986
Data de Emissão: 15/03/2024
Data de Transporte: 16/03/2024
Data de Recebimento: 18/03/2024

Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90
Endereço: Rua Empresário Agenello Senger, nº S/N
Município: Carazinho
UF: RS

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10
Endereço: Av. Brasil, 500
Município: Porto Alegre
Estado: RS
Placa do Veículo: ABC-1D23
Motorista: João da Silva

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44
Endereço: Rod. BR-116, Km 20
Município: Curitiba
UF: PR

Identificação dos Resíduos
Item. Código IBAMA e Denominação
Estado Físico
Classe
Qtde
Unidade
Tecnologia
1. 200108 Resíduos biodegradáveis de cozinha e cantinas
Sólido
IIA
Caçamba Fechada
1.500,50000
Quilograma
Compostagem`;

  describe('parse', () => {
    it('should parse a valid SINFAT MTR document with high confidence', () => {
      const result = parser.parse(stubTextExtractionResult(validSinfatText));

      expect(result.data.documentNumber?.parsed).toBe('0124048986');
      expect(result.data.documentNumber?.confidence).toBe('high');
      expect(result.data.issueDate?.parsed).toBe('15/03/2024');
      expect(result.data.generator?.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator?.taxId.parsed).toBe('12.345.678/0001-90');
      expect(result.data.generator?.address.parsed).toBe(
        'Rua Empresario Agenello Senger, nº S/N',
      );
      expect(result.data.generator?.city.parsed).toBe('Carazinho');
      expect(result.data.generator?.state.parsed).toBe('RS');
      expect(result.data.hauler?.name.parsed).toBe(
        'TRANSPORTES AMBIENTAIS S.A.',
      );
      expect(result.data.hauler?.taxId.parsed).toBe('98.765.432/0001-10');
      expect(result.data.receiver?.name.parsed).toBe(
        'RECICLAGEM SUSTENTAVEL LTDA',
      );
      expect(result.data.receiver?.taxId.parsed).toBe('11.222.333/0001-44');
      expect(result.data.vehiclePlate?.parsed).toBe('ABC-1D23');
      expect(result.data.driverName?.parsed).toBe('Joao da Silva');
      expect(result.data.transportDate?.parsed).toBe('16/03/2024');
      expect(result.data.receivingDate?.parsed).toBe('18/03/2024');
      expect(result.data.documentType).toBe('transportManifest');
      expect(result.data.wasteTypes?.map(toWasteTypeEntryData)).toEqual([
        {
          code: '200108',
          description: 'Residuos biodegradaveis de cozinha e cantinas',
        },
      ]);
      expect(result.data.wasteTypes?.[0]?.quantity.confidence).toBe('low');
      expect(result.data.wasteTypes?.[0]?.unit.confidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should match 10-digit MTR numbers without colon', () => {
      const text = `Manifesto de Transporte de Resíduos
MTR nº 0124048986
Data de Emissão: 15/03/2024`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.documentNumber?.parsed).toBe('0124048986');
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteText = `Manifesto de Transporte de Resíduos
Fundação Estadual de Proteção Ambiental
Data de Emissão: 15/03/2024

Gerador
EMPRESA GERADORA LTDA`;

      const result = parser.parse(stubTextExtractionResult(incompleteText));

      expect(result.reviewRequired).toBe(true);
    });

    it('should set low confidence for entities with missing CNPJ', () => {
      const noCnpjText = `Manifesto de Transporte de Resíduos
MTR nº 0124048986
Data de Emissão: 01/01/2024

Gerador
EMPRESA SEM CNPJ

Transportador
TRANSPORTE SEM CNPJ

Destinatário
DESTINO SEM CNPJ`;

      const result = parser.parse(stubTextExtractionResult(noCnpjText));

      expect(result.data.generator?.name.confidence).toBe('low');
      expect(result.data.hauler?.name.confidence).toBe('low');
      expect(result.data.receiver?.name.confidence).toBe('low');
    });

    it('should strip trailing registration numbers from entity names', () => {
      const text = `Manifesto de Transporte de Resíduos
MTR nº 0124048986
Data de Emissão: 15/03/2024

Gerador
BODY FOOD FABRICANTES 262960
CNPJ: 28324667000169

Transportador
COMPOSTAMAIS LTDA. - 112752
CNPJ: 33545743000104

Destinatário
RECICLAGEM VERDE LTDA
CNPJ: 11222333000144`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator?.name.parsed).toBe('BODY FOOD FABRICANTES');
      expect(result.data.hauler?.name.parsed).toBe('COMPOSTAMAIS LTDA.');
    });

    it('should extract driver and plate from multi-line section layout', () => {
      const text = `Manifesto de Transporte de Resíduos
Fundação Estadual de Proteção Ambiental
MTR nº 0124048986
Data de Emissão: 15/03/2024

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10
Nome do Motorista
Placa do Veículo
Rafael Silva
NKW1862
nome e assinatura do responsável

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44
Tecnologia: Compostagem`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.driverName?.parsed).toBe('Rafael Silva');
      expect(result.data.driverName?.confidence).toBe('high');
      expect(result.data.vehiclePlate?.parsed).toBe('NKW1862');
      expect(result.data.vehiclePlate?.confidence).toBe('high');
    });

    it('should set low confidence when driver/plate labels are outside any section', () => {
      const text = `Manifesto de Transporte de Resíduos
MTR nº 0124048986
Data de Emissão: 15/03/2024
Motorista
Placa do Veículo
Tecnologia: Compostagem`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.driverName?.parsed).toBe('');
      expect(result.data.driverName?.confidence).toBe('low');
      expect(result.data.vehiclePlate?.parsed).toBe('');
      expect(result.data.vehiclePlate?.confidence).toBe('low');
    });

    it('should set low confidence when driver/plate labels exist but no values', () => {
      const text = `Manifesto de Transporte de Resíduos
MTR nº 0124048986
Data de Emissão: 15/03/2024

Transportador
TRANSPORTES LTDA
CNPJ: 98.765.432/0001-10
Nome do Motorista
Placa do Veículo

Destinatário
RECICLAGEM LTDA
CNPJ: 11.222.333/0001-44
Tecnologia: Compostagem`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.driverName?.parsed).toBe('');
      expect(result.data.driverName?.confidence).toBe('low');
      expect(result.data.vehiclePlate?.parsed).toBe('');
      expect(result.data.vehiclePlate?.confidence).toBe('low');
    });

    it('should extract waste types from Textract blocks using table extraction', () => {
      const headerY = 0.68;
      const dataY = 0.71;

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(validSinfatText, [
          {
            boundingBox: {
              height: 0.02,
              left: 0.04,
              top: headerY,
              width: 0.18,
            },
            text: 'Item. Código IBAMA e Denominação',
          },
          {
            boundingBox: { height: 0.02, left: 0.4, top: headerY, width: 0.07 },
            text: 'Estado Físico',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.49,
              top: headerY,
              width: 0.03,
            },
            text: 'Classe',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.54,
              top: headerY,
              width: 0.09,
            },
            text: 'Acondicionamento',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.65,
              top: headerY,
              width: 0.02,
            },
            text: 'Qtde',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.72,
              top: headerY,
              width: 0.04,
            },
            text: 'Unidade',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.84,
              top: headerY,
              width: 0.05,
            },
            text: 'Tecnologia',
          },
          {
            boundingBox: { height: 0.02, left: 0.04, top: dataY, width: 0.31 },
            text: '1. 020501 Materiais impróprios para consumo',
          },
          {
            boundingBox: { height: 0.02, left: 0.49, top: dataY, width: 0.03 },
            text: 'IIA',
          },
          {
            boundingBox: { height: 0.02, left: 0.65, top: dataY, width: 0.05 },
            text: '14,95000',
          },
          {
            boundingBox: { height: 0.02, left: 0.72, top: dataY, width: 0.04 },
            text: 'Tonelada',
          },
        ]),
      );

      expect(result.data.wasteTypes?.map(toWasteTypeEntryData)).toEqual([
        {
          classification: 'IIA',
          code: '020501',
          description: 'Materiais impróprios para consumo',
          quantity: 14.95,
          unit: 'Tonelada',
        },
      ]);
    });

    it('should extract multiple waste items from text fallback', () => {
      const text = `Manifesto de Transporte de Resíduos
Fundação Estadual de Proteção Ambiental
MTR nº 0124048986
Data de Emissão: 15/03/2024
Data de Transporte: 16/03/2024
Data de Recebimento: 18/03/2024

Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44

1. 020502 Lodos do Tratamento local de efluentes
2. 200108 Resíduos biodegradáveis de cozinha e cantinas`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.wasteTypes?.map(toWasteTypeEntryData)).toEqual([
        {
          code: '020502',
          description: 'Lodos do Tratamento local de efluentes',
        },
        {
          code: '200108',
          description: 'Residuos biodegradaveis de cozinha e cantinas',
        },
      ]);
    });

    it('should skip rows without description in table extraction', () => {
      const headerY = 0.68;
      const dataY = 0.71;

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(validSinfatText, [
          {
            boundingBox: {
              height: 0.02,
              left: 0.04,
              top: headerY,
              width: 0.18,
            },
            text: 'Item. Código IBAMA e Denominação',
          },
          {
            boundingBox: { height: 0.02, left: 0.4, top: headerY, width: 0.07 },
            text: 'Estado Físico',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.49,
              top: headerY,
              width: 0.03,
            },
            text: 'Classe',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.54,
              top: headerY,
              width: 0.09,
            },
            text: 'Acondicionamento',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.65,
              top: headerY,
              width: 0.02,
            },
            text: 'Qtde',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.72,
              top: headerY,
              width: 0.04,
            },
            text: 'Unidade',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.84,
              top: headerY,
              width: 0.05,
            },
            text: 'Tecnologia',
          },
          {
            boundingBox: { height: 0.02, left: 0.49, top: dataY, width: 0.03 },
            text: 'IIA',
          },
        ]),
      );

      expect(result.data.wasteTypes).toBeUndefined();
    });

    it('should filter out footer lines that are not waste entries in table extraction', () => {
      const headerY = 0.68;
      const dataY = 0.71;
      const footerY = 0.73;

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(validSinfatText, [
          {
            boundingBox: {
              height: 0.02,
              left: 0.04,
              top: headerY,
              width: 0.18,
            },
            text: 'Item. Código IBAMA e Denominação',
          },
          {
            boundingBox: { height: 0.02, left: 0.4, top: headerY, width: 0.07 },
            text: 'Estado Físico',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.49,
              top: headerY,
              width: 0.03,
            },
            text: 'Classe',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.54,
              top: headerY,
              width: 0.09,
            },
            text: 'Acondicionamento',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.65,
              top: headerY,
              width: 0.02,
            },
            text: 'Qtde',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.72,
              top: headerY,
              width: 0.04,
            },
            text: 'Unidade',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.84,
              top: headerY,
              width: 0.05,
            },
            text: 'Tecnologia',
          },
          {
            boundingBox: { height: 0.02, left: 0.04, top: dataY, width: 0.31 },
            text: '1. 020299 Outros resíduos',
          },
          {
            boundingBox: {
              height: 0.02,
              left: 0.04,
              top: footerY,
              width: 0.21,
            },
            text: 'Descrição int. do Gerador: Efluente Industrial',
          },
          {
            boundingBox: { height: 0.02, left: 0.04, top: 0.76, width: 0.35 },
            text: 'Observação do Recebimento dos Residuos',
          },
        ]),
      );

      expect(result.data.wasteTypes?.map(toWasteTypeEntryData)).toEqual([
        { code: '020299', description: 'Outros resíduos' },
      ]);
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid SINFAT MTR text', () => {
      const score = parser.getMatchScore(
        stubTextExtractionResult(validSinfatText),
      );

      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for non-MTR text', () => {
      const irrelevantText = 'This is a random document with no MTR patterns';
      const score = parser.getMatchScore(
        stubTextExtractionResult(irrelevantText),
      );

      expect(score).toBeLessThan(0.3);
    });
  });

  describe('metadata', () => {
    it('should have correct document type and layout id', () => {
      expect(parser.documentType).toBe('transportManifest');
      expect(parser.layoutId).toBe('mtr-sinfat');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
