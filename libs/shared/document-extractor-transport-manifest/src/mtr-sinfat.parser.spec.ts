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
Endereço: Rua Industrial, nº S/N
Município: Cidade Interior
UF: RS

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10
Endereço: Av. Brasil, 500
Município: Porto Alegre
Estado: RS
Placa do Veículo: ABC-1D23
Motorista: Pedro Santos

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
        'Rua Industrial, nº S/N',
      );
      expect(result.data.generator?.city.parsed).toBe('Cidade Interior');
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
      expect(result.data.driverName?.parsed).toBe('Pedro Santos');
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

    it('should leave state empty when the FEPAM state cell holds address overflow', () => {
      const text = `Manifesto de Transporte de Resíduos
Fundação Estadual de Proteção Ambiental
MTR nº 0124048986

Identificação do Gerador
Razão Social: EMPRESA GERADORA LTDA - 12345
CPF/CNPJ: 12.345.678/0001-90
Endereço: Rodovia RS-100, S/N- KM 12,5, nº S/N
Município: Cidade Interior
Estado:
Celular:

Identificação do Transportador
Razão Social: TRANSPORTES AMBIENTAIS S.A. - 54321
CPF/CNPJ: 98.765.432/0001-10
Endereço: Rua das Flores, nº 100 sala B segundo piso
Município: Cidade Capital
Estado: sala B

Identificação do Destinador
Razão Social: RECICLAGEM SUSTENTÁVEL LTDA - 67890
CPF/CNPJ: 11.222.333/0001-44
Endereço: Rodovia BR-101, nº S/N Km 120+500 no Acesso Norte
Estado: Km
Município: Cidade Vizinha`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator?.city.parsed).toBe('Cidade Interior');
      expect(result.data.generator?.state.parsed).toBe('');
      expect(result.data.hauler?.city.parsed).toBe('Cidade Capital');
      expect(result.data.hauler?.state.parsed).toBe('');
      expect(result.data.receiver?.address.parsed).toBe(
        'Rodovia BR-101, nº S/N Km 120+500 no Acesso Norte',
      );
      expect(result.data.receiver?.city.parsed).toBe('Cidade Vizinha');
      expect(result.data.receiver?.state.parsed).toBe('');
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
CNPJ: 88999000000133

Transportador
COMPOST VERDE LTDA. - 112752
CNPJ: 77888999000122

Destinatário
RECICLAGEM VERDE LTDA
CNPJ: 11222333000144`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator?.name.parsed).toBe('BODY FOOD FABRICANTES');
      expect(result.data.hauler?.name.parsed).toBe('COMPOST VERDE LTDA.');
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
Lucas Ferreira
HIJ3K56
nome e assinatura do responsável

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44
Tecnologia: Compostagem`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.driverName?.parsed).toBe('Lucas Ferreira');
      expect(result.data.driverName?.confidence).toBe('high');
      expect(result.data.vehiclePlate?.parsed).toBe('HIJ3K56');
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

    it('should handle waste row with unparseable quantity in table extraction', () => {
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
            text: '...',
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
          unit: 'Tonelada',
        },
      ]);
    });

    it('should parse document without issue date', () => {
      const text = `Manifesto de Transporte de Resíduos
Fundação Estadual de Proteção Ambiental
MTR nº 0124048986
Data de Transporte: 16/03/2024

Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44
Tecnologia: Compostagem`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.issueDate).toBeUndefined();
      expect(result.data.transportDate?.parsed).toBe('16/03/2024');
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

    it('should capture waste row when item marker is emitted as a separate block within the description column', () => {
      const headerY = 0.7;
      const dataY = 0.72;

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
          // CONAMA-code+description block emitted first (slightly lower top).
          {
            boundingBox: {
              height: 0.02,
              left: 0.057,
              top: dataY - 0.001,
              width: 0.22,
            },
            text: '999900 Fictional waste description',
          },
          // Item-marker block emitted later in y order but within the same cluster
          // and inside the description column's x range.
          {
            boundingBox: {
              height: 0.02,
              left: 0.04,
              top: dataY + 0.0005,
              width: 0.01,
            },
            text: '1.',
          },
          {
            boundingBox: { height: 0.02, left: 0.4, top: dataY, width: 0.07 },
            text: 'Semi-solido',
          },
          {
            boundingBox: { height: 0.02, left: 0.49, top: dataY, width: 0.03 },
            text: 'IIA',
          },
          {
            boundingBox: { height: 0.02, left: 0.65, top: dataY, width: 0.05 },
            text: '8.400,00000',
          },
          {
            boundingBox: { height: 0.02, left: 0.72, top: dataY, width: 0.04 },
            text: 'Quilograma',
          },
        ]),
      );

      expect(result.data.wasteTypes?.map(toWasteTypeEntryData)).toEqual([
        {
          classification: 'IIA',
          code: '999900',
          description: 'Fictional waste description',
          quantity: 8400,
          unit: 'Quilograma',
        },
      ]);
    });
  });

  describe('table layout defects', () => {
    type BlockInput = Parameters<
      typeof stubTextExtractionResultWithBlocks
    >[1][number];

    const cell = (
      text: string,
      left: number,
      top: number,
      width = 0.05,
      blockType = 'LINE',
    ): BlockInput => ({
      blockType,
      boundingBox: { height: 0.008, left, top, width },
      text,
    });

    const headerCells = (top: number): BlockInput[] => [
      cell('Item. Código IBAMA e Denominação', 0.04, top, 0.18),
      cell('Estado Físico', 0.4, top, 0.07),
      cell('Classe', 0.49, top, 0.03),
      cell('Acondicionamento', 0.54, top, 0.09),
      cell('Qtde', 0.65, top, 0.02),
      cell('Unidade', 0.72, top, 0.04),
      cell('Tecnologia', 0.84, top, 0.05),
    ];

    const expectedWasteX = {
      classification: 'IIA',
      code: '999999',
      description: 'Waste X',
      quantity: 1234,
      unit: 'Quilograma',
    };

    it('should split a waste row that Textract returned as one line into its word cells', () => {
      const rowTop = 0.71;
      const word = (text: string, left: number, right: number) =>
        cell(text, left, rowTop, right - left, 'WORD');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(validSinfatText, [
          ...headerCells(0.68),
          cell(
            '1. 999999 Waste X Solido IIA Bag 1.234,00000 Quilograma',
            0.04,
            rowTop,
            0.73,
          ),
          word('1.', 0.04, 0.05),
          word('999999', 0.053, 0.1),
          word('Waste', 0.103, 0.22),
          word('X', 0.223, 0.23),
          word('Solido', 0.4, 0.43),
          word('IIA', 0.49, 0.505),
          word('Bag', 0.54, 0.56),
          word('1.234,00000', 0.63, 0.68),
          word('Quilograma', 0.72, 0.77),
        ]),
      );

      expect(result.data.wasteTypes?.map(toWasteTypeEntryData)).toEqual([
        expectedWasteX,
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
