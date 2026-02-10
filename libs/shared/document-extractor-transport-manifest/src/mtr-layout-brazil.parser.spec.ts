import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { MtrLayoutBrazilParser } from './mtr-layout-brazil.parser';

describe('MtrLayoutBrazilParser', () => {
  const parser = new MtrLayoutBrazilParser();

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

Transportador
TRANSPORTES AMBIENTAIS S.A.
CNPJ: 98.765.432/0001-10
Placa do Veículo: ABC-1D23
Motorista: João da Silva

Destinatário
RECICLAGEM SUSTENTÁVEL LTDA
CNPJ: 11.222.333/0001-44

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
      expect(result.data.generator.parsed.name).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator.parsed.taxId).toBe('12.345.678/0001-90');
      expect(result.data.hauler.parsed.name).toBe(
        'TRANSPORTES AMBIENTAIS S.A.',
      );
      expect(result.data.hauler.parsed.taxId).toBe('98.765.432/0001-10');
      expect(result.data.receiver.parsed.name).toBe(
        'RECICLAGEM SUSTENTÁVEL LTDA',
      );
      expect(result.data.receiver.parsed.taxId).toBe('11.222.333/0001-44');
      expect(result.data.vehiclePlate?.parsed).toBe('ABC-1D23');
      expect(result.data.driverName?.parsed).toBe('João da Silva');
      expect(result.data.wasteTypes?.parsed).toEqual([
        {
          classification: 'II - Não Perigoso',
          description: 'Plástico',
          quantity: 1500.5,
        },
      ]);
      expect(result.data.transportDate?.parsed).toBe('16/03/2024');
      expect(result.data.receivingDate?.parsed).toBe('18/03/2024');
      expect(result.data.documentType).toBe('transportManifest');
      expect(result.reviewRequired).toBe(false);
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
      expect(result.data.missingRequiredFields).toContain('documentNumber');
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

      expect(result.data.generator.confidence).toBe('low');
      expect(result.data.hauler.confidence).toBe('low');
      expect(result.data.receiver.confidence).toBe('low');
      expect(result.data.extractionConfidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
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

      expect(result.data.generator.parsed.name).toBe('EMPRESA REAL NAME LTDA');
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

      expect(result.data.generator.parsed.name).toBe('EMPRESA VALID NAME LTDA');
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

      expect(result.data.generator.confidence).toBe('low');
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

      expect(result.data.wasteTypes?.parsed[0]?.quantity).toBeUndefined();
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

      expect(result.data.wasteTypes?.parsed[0]?.quantity).toBeUndefined();
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

      expect(result.data.generator.parsed.taxId).toBe('28324667000169');
      expect(result.data.generator.parsed.name).toBe(
        'BODY FOOD FABRICANTES DE ALIMENTOS SAUDAVEIS',
      );
      expect(result.data.generator.confidence).toBe('high');
      expect(result.data.hauler.parsed.taxId).toBe('33545743000104');
      expect(result.data.hauler.confidence).toBe('high');
      expect(result.data.receiver.parsed.taxId).toBe('11222333000144');
      expect(result.data.receiver.confidence).toBe('high');
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

      expect(result.data.generator.parsed.name).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator.parsed.taxId).toBe('12.345.678/0001-90');
      expect(result.data.generator.confidence).toBe('high');
      expect(result.data.hauler.parsed.name).toBe(
        'TRANSPORTES AMBIENTAIS S.A.',
      );
      expect(result.data.hauler.confidence).toBe('high');
      expect(result.data.receiver.parsed.name).toBe(
        'RECICLAGEM SUSTENTÁVEL LTDA',
      );
      expect(result.data.receiver.confidence).toBe('high');
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

      expect(result.data.receiver.parsed.name).toBe(
        'RECICLAGEM SUSTENTÁVEL LTDA',
      );
      expect(result.data.receiver.parsed.taxId).toBe('11.222.333/0001-44');
      expect(result.data.receiver.confidence).toBe('high');
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

      expect(result.data.generator.parsed.name).toBe(
        'BODY FOOD FABRICANTES DE ALIMENTOS SAUDÁVEIS',
      );
      expect(result.data.hauler.parsed.name).toBe('COMPOSTAMAIS LTDA.');
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

    it('should not extract driver name across newlines into labels', () => {
      const text = `MANIFESTO DE TRANSPORTE DE RESÍDUOS - MTR
MTR Nº: 123456789
Data de Emissão: 15/03/2024
Motorista
Placa do Veículo: ABC1D23
IBAMA`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.driverName?.parsed).not.toBe('Placa do Veículo');
      expect(result.data.driverName?.confidence).toBe('low');
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

      expect(result.data.generator.parsed.name).toBe('EMPRESA GERADORA LTDA');
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
      expect(parser.layoutId).toBe('mtr-brazil');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
