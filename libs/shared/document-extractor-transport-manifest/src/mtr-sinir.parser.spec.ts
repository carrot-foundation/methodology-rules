import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { toWasteTypeEntryData } from './mtr-shared.helpers';
import { MtrSinirParser } from './mtr-sinir.parser';

describe('MtrSinirParser', () => {
  const parser = new MtrSinirParser();

  beforeEach(() => {
    clearRegistry();
  });

  const validMtrText = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 123456789
Data de Emissão: 15/03/2024
Data de Transporte: 16/03/2024
Data de Recebimento: 18/03/2024

Gerador
Razão Social: EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90
Endereço: Rua Empresário Agenello Senger, nº S/N
Município: Carazinho
UF: RS

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10
Endereço: Av. Brasil, 500
Município: São Paulo
Estado: SP
Placa do Veículo: ABC-1D23
Motorista: João da Silva

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44
Endereço: Rod. BR-116, Km 20
Município: Curitiba
UF: PR

Tipo de Resíduo: Plástico
Classe: II - Não Perigoso
Quantidade: 1.500,50 kg

IBAMA - Instituto Brasileiro do Meio Ambiente`;

  describe('parse', () => {
    it('should parse a valid MTR document with high confidence', () => {
      const result = parser.parse(stubTextExtractionResult(validMtrText));

      expect(result.data.documentNumber.parsed).toBe('123456789');
      expect(result.data.documentNumber.confidence).toBe('high');
      expect(result.data.issueDate.parsed).toBe('15/03/2024');
      expect(result.data.generator.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator.taxId.parsed).toBe('12.345.678/0001-90');
      expect(result.data.generator.address.parsed).toBe(
        'Rua Empresario Agenello Senger, nº S/N',
      );
      expect(result.data.generator.city.parsed).toBe('Carazinho');
      expect(result.data.generator.state.parsed).toBe('RS');
      expect(result.data.hauler.name.parsed).toBe(
        'TRANSPORTES AMBIENTAIS S.A.',
      );
      expect(result.data.hauler.taxId.parsed).toBe('98.765.432/0001-10');
      expect(result.data.hauler.address.parsed).toBe('Av. Brasil, 500');
      expect(result.data.hauler.city.parsed).toBe('Sao Paulo');
      expect(result.data.hauler.state.parsed).toBe('SP');
      expect(result.data.receiver.name.parsed).toBe(
        'RECICLAGEM SUSTENTAVEL LTDA',
      );
      expect(result.data.receiver.taxId.parsed).toBe('11.222.333/0001-44');
      expect(result.data.receiver.address.parsed).toBe('Rod. BR-116, Km 20');
      expect(result.data.receiver.city.parsed).toBe('Curitiba');
      expect(result.data.receiver.state.parsed).toBe('PR');
      expect(result.data.vehiclePlate?.parsed).toBe('ABC-1D23');
      expect(result.data.driverName?.parsed).toBe('Joao da Silva');
      expect(result.data.wasteTypes?.map(toWasteTypeEntryData)).toEqual([
        {
          classification: 'II - Nao Perigoso',
          description: 'Plastico',
          quantity: 1500.5,
        },
      ]);
      expect(result.data.wasteTypes?.[0]?.code.confidence).toBe('low');
      expect(result.data.wasteTypes?.[0]?.unit.confidence).toBe('low');
      expect(result.data.transportDate?.parsed).toBe('16/03/2024');
      expect(result.data.receivingDate?.parsed).toBe('18/03/2024');
      expect(result.data.documentType).toBe('transportManifest');
      expect(result.reviewRequired).toBe(true);
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteMtrText = `
        MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
        Data de Emissão: 15/03/2024

        Gerador
        EMPRESA GERADORA LTDA
      `;

      const result = parser.parse(stubTextExtractionResult(incompleteMtrText));

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons.length).toBeGreaterThan(0);
    });

    it('should set low confidence for entities with missing CNPJ', () => {
      const noEntityCnpjText = `
        MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
        MTR Nº: 999888777
        Data de Emissão: 01/01/2024

        Gerador
        EMPRESA SEM CNPJ

        Transportador
        TRANSPORTE SEM CNPJ

        Destinatário
        DESTINO SEM CNPJ
      `;

      const result = parser.parse(stubTextExtractionResult(noEntityCnpjText));

      expect(result.data.generator.name.confidence).toBe('low');
      expect(result.data.hauler.name.confidence).toBe('low');
      expect(result.data.receiver.name.confidence).toBe('low');
      expect(result.data.extractionConfidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should parse entities without address fields', () => {
      const noAddressText = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44

IBAMA`;

      const result = parser.parse(stubTextExtractionResult(noAddressText));

      expect(result.data.generator.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator.address.parsed).toBe('');
      expect(result.data.generator.address.confidence).toBe('low');
      expect(result.data.generator.city.parsed).toBe('');
      expect(result.data.generator.city.confidence).toBe('low');
      expect(result.data.generator.state.parsed).toBe('');
      expect(result.data.generator.state.confidence).toBe('low');
      expect(result.data.hauler.address.parsed).toBe('');
      expect(result.data.hauler.address.confidence).toBe('low');
      expect(result.data.receiver.address.parsed).toBe('');
      expect(result.data.receiver.address.confidence).toBe('low');
    });

    it('should handle MTR number variations', () => {
      const variations = [
        'MTR N° 123456',
        'MTR Nº 123456',
        'MTR N: 123456',
        'MTR: 123456',
        'MTR 123456',
      ];

      for (const variation of variations) {
        const text = `${variation}\nData de Emissão: 01/01/2024`;
        const result = parser.parse(stubTextExtractionResult(text));

        expect(result.data.documentNumber.parsed).toBe('123456');
      }
    });

    it('should skip lines containing CNPJ when extracting entity name', () => {
      const cnpjInDifferentLineText = `
MTR Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
CNPJ: 12.345.678/0001-90 - Some text
EMPRESA REAL NAME LTDA
CNPJ: 12.345.678/0001-90
`;

      const result = parser.parse(
        stubTextExtractionResult(cnpjInDifferentLineText),
      );

      expect(result.data.generator.name.parsed).toBe('EMPRESA REAL NAME LTDA');
    });

    it('should skip short and numeric lines when extracting entity name', () => {
      const shortLinesText = `
MTR Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
AB
123456
CNPJ: 12.345.678/0001-90
EMPRESA VALID NAME LTDA
`;

      const result = parser.parse(stubTextExtractionResult(shortLinesText));

      expect(result.data.generator.name.parsed).toBe('EMPRESA VALID NAME LTDA');
    });

    it('should handle entity with CNPJ but only short/invalid names', () => {
      const noValidNameText = `
MTR Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
AB
12
CNPJ: 12.345.678/0001-90
`;

      const result = parser.parse(stubTextExtractionResult(noValidNameText));

      expect(result.data.generator.name.confidence).toBe('low');
    });

    it('should handle invalid waste quantity format', () => {
      const invalidQuantityText = `
MTR Nº: 123456789
Data de Emissão: 15/03/2024
Tipo de Resíduo: Plástico
Quantidade: invalid kg
`;

      const result = parser.parse(
        stubTextExtractionResult(invalidQuantityText),
      );

      expect(
        result.data.wasteTypes?.map(toWasteTypeEntryData)[0]?.quantity,
      ).toBeUndefined();
    });

    it('should handle waste quantity with NaN result', () => {
      // Use dots that match [\d.,]+ pattern but parse to NaN
      const nanQuantityText = `
MTR Nº: 123456789
Data de Emissão: 15/03/2024
Tipo de Resíduo: Plástico
Quantidade: ... kg
`;

      const result = parser.parse(stubTextExtractionResult(nanQuantityText));

      expect(
        result.data.wasteTypes?.map(toWasteTypeEntryData)[0]?.quantity,
      ).toBeUndefined();
    });

    it('should parse entities with unformatted CNPJs (raw 14 digits)', () => {
      const unformattedCnpjText = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 987654321
Data de Emissão: 10/06/2025

Gerador
BODY FOOD FABRICANTES DE ALIMENTOS SAUDAVEIS
CNPJ: 28324667000169

Transportador
COMPOSTAMAIS INDUSTRIA E COMERCIO DE COMPOSTAGEM LTDA.
CNPJ: 33545743000104

Destinatário
RECICLAGEM VERDE LTDA
CNPJ: 11222333000144

IBAMA - Instituto Brasileiro do Meio Ambiente`;

      const result = parser.parse(
        stubTextExtractionResult(unformattedCnpjText),
      );

      expect(result.data.generator.taxId.parsed).toBe('28324667000169');
      expect(result.data.generator.name.parsed).toBe(
        'BODY FOOD FABRICANTES DE ALIMENTOS SAUDAVEIS',
      );
      expect(result.data.generator.name.confidence).toBe('high');
      expect(result.data.hauler.taxId.parsed).toBe('33545743000104');
      expect(result.data.hauler.name.confidence).toBe('high');
      expect(result.data.receiver.taxId.parsed).toBe('11222333000144');
      expect(result.data.receiver.name.confidence).toBe('high');
    });

    it('should parse entities with "Identificação do ..." section headers', () => {
      const identSectionText = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 111222333
Data de Emissão: 05/01/2025

Identificação do Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90

Identificação do Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10

Identificação do Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44

IBAMA - Instituto Brasileiro do Meio Ambiente`;

      const result = parser.parse(stubTextExtractionResult(identSectionText));

      expect(result.data.generator.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator.taxId.parsed).toBe('12.345.678/0001-90');
      expect(result.data.generator.name.confidence).toBe('high');
      expect(result.data.hauler.name.parsed).toBe(
        'TRANSPORTES AMBIENTAIS S.A.',
      );
      expect(result.data.hauler.name.confidence).toBe('high');
      expect(result.data.receiver.name.parsed).toBe(
        'RECICLAGEM SUSTENTAVEL LTDA',
      );
      expect(result.data.receiver.name.confidence).toBe('high');
    });

    it('should parse entities with "Identificação do Destinador" header', () => {
      const destinadorText = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 444555666
Data de Emissão: 15/03/2024

Identificação do Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90

Identificação do Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10

Identificação do Destinador
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44

IBAMA - Instituto Brasileiro do Meio Ambiente`;

      const result = parser.parse(stubTextExtractionResult(destinadorText));

      expect(result.data.receiver.name.parsed).toBe(
        'RECICLAGEM SUSTENTAVEL LTDA',
      );
      expect(result.data.receiver.taxId.parsed).toBe('11.222.333/0001-44');
      expect(result.data.receiver.name.confidence).toBe('high');
    });

    it('should parse "Data da Emissão" variant', () => {
      const text = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 999888777
Data da Emissão: 10/06/2025
IBAMA`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.issueDate.parsed).toBe('10/06/2025');
      expect(result.data.issueDate.confidence).toBe('high');
    });

    it('should strip trailing registration numbers from entity names', () => {
      const text = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
BODY FOOD FABRICANTES DE ALIMENTOS SAUDÁVEIS 262960
CNPJ: 28324667000169

Transportador
COMPOSTAMAIS LTDA. - 112752
CNPJ: 33545743000104

Destinatário
RECICLAGEM VERDE LTDA
CNPJ: 11222333000144

IBAMA`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.generator.name.parsed).toBe(
        'BODY FOOD FABRICANTES DE ALIMENTOS SAUDAVEIS',
      );
      expect(result.data.hauler.name.parsed).toBe('COMPOSTAMAIS LTDA.');
    });

    it('should mark fields as low confidence when label is present but value is empty', () => {
      const text = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 123456789
Data da Emissão:
Data de Transporte:
Data de Recebimento:
Motorista
Placa do Veículo
IBAMA`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.issueDate.parsed).toBe('');
      expect(result.data.issueDate.confidence).toBe('low');
      expect(result.data.transportDate?.parsed).toBe('');
      expect(result.data.transportDate?.confidence).toBe('low');
      expect(result.data.receivingDate?.parsed).toBe('');
      expect(result.data.receivingDate?.confidence).toBe('low');
      expect(result.data.driverName?.parsed).toBe('');
      expect(result.data.driverName?.confidence).toBe('low');
      expect(result.data.vehiclePlate?.parsed).toBe('');
      expect(result.data.vehiclePlate?.confidence).toBe('low');
    });

    it('should set low confidence when labels exist but no valid values follow', () => {
      const text = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 123456789
Data de Emissão: 15/03/2024

Transportador
TRANSPORTES LTDA
CNPJ: 98.765.432/0001-10
Nome do Motorista
Placa do Veículo

Destinatário
RECICLAGEM LTDA
CNPJ: 11.222.333/0001-44
IBAMA`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.driverName?.parsed).toBe('');
      expect(result.data.driverName?.confidence).toBe('low');
      expect(result.data.vehiclePlate?.parsed).toBe('');
      expect(result.data.vehiclePlate?.confidence).toBe('low');
    });

    it('should extract driver and plate from multi-line section layout', () => {
      const text = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 123456789
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
RECICLAGEM LTDA
CNPJ: 11.222.333/0001-44
IBAMA`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.driverName?.parsed).toBe('Rafael Silva');
      expect(result.data.driverName?.confidence).toBe('high');
      expect(result.data.vehiclePlate?.parsed).toBe('NKW1862');
      expect(result.data.vehiclePlate?.confidence).toBe('high');
    });

    it('should handle section extraction with empty lines array', () => {
      // Text that triggers section parsing with potential edge cases
      const minimalSectionText = `
MTR Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90
Transportador
`;

      const result = parser.parse(stubTextExtractionResult(minimalSectionText));

      expect(result.data.generator.name.parsed).toBe('EMPRESA GERADORA LTDA');
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid MTR text', () => {
      const score = parser.getMatchScore(
        stubTextExtractionResult(validMtrText),
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

    it('should return medium score for partial MTR text', () => {
      const partialMtrText = `
        MTR - Manifesto de Transporte
        Resíduo sólido
      `;
      const score = parser.getMatchScore(
        stubTextExtractionResult(partialMtrText),
      );

      expect(score).toBeGreaterThanOrEqual(0.2);
      expect(score).toBeLessThan(0.6);
    });
  });

  describe('metadata', () => {
    it('should have correct document type and layout id', () => {
      expect(parser.documentType).toBe('transportManifest');
      expect(parser.layoutId).toBe('mtr-sinir');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
