import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

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

Tipo de Resíduo: Plástico
Classe: II - Não Perigoso
Quantidade: 1.500,50 kg
Tecnologia: Compostagem`;

  describe('parse', () => {
    it('should parse a valid SINFAT MTR document with high confidence', () => {
      const result = parser.parse(stubTextExtractionResult(validSinfatText));

      expect(result.data.documentNumber.parsed).toBe('0124048986');
      expect(result.data.documentNumber.confidence).toBe('high');
      expect(result.data.issueDate.parsed).toBe('15/03/2024');
      expect(result.data.generator.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.data.generator.taxId.parsed).toBe('12.345.678/0001-90');
      expect(result.data.generator.address.parsed).toBe(
        'Rua Empresário Agenello Senger, nº S/N',
      );
      expect(result.data.generator.city.parsed).toBe('Carazinho');
      expect(result.data.generator.state.parsed).toBe('RS');
      expect(result.data.hauler.name.parsed).toBe(
        'TRANSPORTES AMBIENTAIS S.A.',
      );
      expect(result.data.hauler.taxId.parsed).toBe('98.765.432/0001-10');
      expect(result.data.receiver.name.parsed).toBe(
        'RECICLAGEM SUSTENTÁVEL LTDA',
      );
      expect(result.data.receiver.taxId.parsed).toBe('11.222.333/0001-44');
      expect(result.data.vehiclePlate?.parsed).toBe('ABC-1D23');
      expect(result.data.driverName?.parsed).toBe('João da Silva');
      expect(result.data.transportDate?.parsed).toBe('16/03/2024');
      expect(result.data.receivingDate?.parsed).toBe('18/03/2024');
      expect(result.data.documentType).toBe('transportManifest');
      expect(result.reviewRequired).toBe(false);
    });

    it('should match 10-digit MTR numbers without colon', () => {
      const text = `Manifesto de Transporte de Resíduos
MTR nº 0124048986
Data de Emissão: 15/03/2024`;

      const result = parser.parse(stubTextExtractionResult(text));

      expect(result.data.documentNumber.parsed).toBe('0124048986');
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteText = `Manifesto de Transporte de Resíduos
Fundação Estadual de Proteção Ambiental
Data de Emissão: 15/03/2024

Gerador
EMPRESA GERADORA LTDA`;

      const result = parser.parse(stubTextExtractionResult(incompleteText));

      expect(result.reviewRequired).toBe(true);
      expect(result.data.missingRequiredFields).toContain('documentNumber');
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

      expect(result.data.generator.name.confidence).toBe('low');
      expect(result.data.hauler.name.confidence).toBe('low');
      expect(result.data.receiver.name.confidence).toBe('low');
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

      expect(result.data.generator.name.parsed).toBe('BODY FOOD FABRICANTES');
      expect(result.data.hauler.name.parsed).toBe('COMPOSTAMAIS LTDA.');
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
