import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { clearRegistry } from '@carrot-fndn/shared/document-extractor';

import { CdfLayoutBrazilParser } from './cdf-layout-brazil.parser';

const buildExtractionResult = (rawText: string): TextExtractionResult => ({
  blocks: [],
  rawText,
});

describe('CdfLayoutBrazilParser', () => {
  const parser = new CdfLayoutBrazilParser();

  beforeEach(() => {
    clearRegistry();
  });

  const validCdfText = `CERTIFICADO DE DESTINAÇÃO FINAL - CDF
CDF Nº: 987654321
Data de Emissão: 20/03/2024

Gerador
Razão Social: INDÚSTRIA PRODUTORA LTDA
CNPJ: 12.345.678/0001-90

Processador
RECICLAGEM E TRATAMENTO S.A.
CNPJ: 98.765.432/0001-10
Licença Ambiental: LO-12345/2024

Tipo de Tratamento: Compostagem
Período de Processamento: 01/01/2024 a 31/03/2024
Quantidade Total: 2.500,75 kg

Resíduo processado conforme legislação ambiental vigente.`;

  describe('parse', () => {
    it('should parse a valid CDF document with high confidence', () => {
      const result = parser.parse(buildExtractionResult(validCdfText));

      expect(result.data.documentNumber.parsed).toBe('987654321');
      expect(result.data.documentNumber.confidence).toBe('high');
      expect(result.data.issueDate.parsed).toBe('20/03/2024');
      expect(result.data.generator.parsed.name).toBe(
        'INDÚSTRIA PRODUTORA LTDA',
      );
      expect(result.data.generator.parsed.taxId).toBe('12.345.678/0001-90');
      expect(result.data.processor.parsed.name).toBe(
        'RECICLAGEM E TRATAMENTO S.A.',
      );
      expect(result.data.processor.parsed.taxId).toBe('98.765.432/0001-10');
      expect(result.data.environmentalLicense?.parsed).toBe('LO-12345/2024');
      expect(result.data.treatmentMethod?.parsed).toBe('Compostagem');
      expect(result.data.processingPeriod?.parsed).toBe(
        '01/01/2024 a 31/03/2024',
      );
      expect(result.data.wasteQuantity?.parsed).toBe(2500.75);
      expect(result.data.documentType).toBe('recyclingManifest');
      expect(result.reviewRequired).toBe(false);
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteCdfText = `
        CERTIFICADO DE DESTINAÇÃO FINAL - CDF
        Data de Emissão: 20/03/2024

        Gerador
        EMPRESA SEM CNPJ
      `;

      const result = parser.parse(buildExtractionResult(incompleteCdfText));

      expect(result.reviewRequired).toBe(true);
      expect(result.data.missingRequiredFields).toContain('documentNumber');
      expect(result.reviewReasons.length).toBeGreaterThan(0);
    });

    it('should set low confidence for entities with missing CNPJ', () => {
      const noEntityCnpjText = `
        CERTIFICADO DE DESTINAÇÃO FINAL - CDF
        CDF Nº: 111222333
        Data de Emissão: 01/01/2024

        Gerador
        EMPRESA SEM CNPJ

        Processador
        PROCESSADOR SEM CNPJ
      `;

      const result = parser.parse(buildExtractionResult(noEntityCnpjText));

      expect(result.data.generator.confidence).toBe('low');
      expect(result.data.processor.confidence).toBe('low');
      expect(result.data.extractionConfidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should handle CDF number variations', () => {
      const variations = [
        'CDF N° 123456',
        'CDF Nº 123456',
        'CDF N: 123456',
        'CDF: 123456',
        'Certificado de Destinação Final Nº 123456',
      ];

      for (const variation of variations) {
        const text = `${variation}\nData de Emissão: 01/01/2024`;
        const result = parser.parse(buildExtractionResult(text));

        expect(result.data.documentNumber.parsed).toBe('123456');
      }
    });

    it('should handle alternative section names', () => {
      const alternativeSectionsText = `CDF Nº: 555666777
Data de Emissão: 15/06/2024

Origem
EMPRESA ORIGEM LTDA
CNPJ: 11.111.111/0001-11

Tratador
TRATADOR AMBIENTAL S.A.
CNPJ: 22.222.222/0001-22`;

      const result = parser.parse(
        buildExtractionResult(alternativeSectionsText),
      );

      expect(result.data.generator.parsed.name).toBe('EMPRESA ORIGEM LTDA');
      expect(result.data.processor.parsed.name).toBe('TRATADOR AMBIENTAL S.A.');
    });

    it('should skip lines containing CNPJ when extracting entity name', () => {
      const cnpjInDifferentLineText = `
CDF Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
CNPJ: 12.345.678/0001-90 - Some text
EMPRESA REAL NAME LTDA
CNPJ: 12.345.678/0001-90
`;

      const result = parser.parse(
        buildExtractionResult(cnpjInDifferentLineText),
      );

      expect(result.data.generator.parsed.name).toBe('EMPRESA REAL NAME LTDA');
    });

    it('should skip short and numeric lines when extracting entity name', () => {
      const shortLinesText = `
CDF Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
AB
123456
CNPJ: 12.345.678/0001-90
EMPRESA VALID NAME LTDA
`;

      const result = parser.parse(buildExtractionResult(shortLinesText));

      expect(result.data.generator.parsed.name).toBe('EMPRESA VALID NAME LTDA');
    });

    it('should handle entity with CNPJ but only short/invalid names', () => {
      const noValidNameText = `
CDF Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
AB
12
CNPJ: 12.345.678/0001-90
`;

      const result = parser.parse(buildExtractionResult(noValidNameText));

      expect(result.data.generator.confidence).toBe('low');
    });

    it('should handle invalid waste quantity format', () => {
      const invalidQuantityText = `
CDF Nº: 123456789
Data de Emissão: 15/03/2024
Quantidade Total: invalid kg
`;

      const result = parser.parse(buildExtractionResult(invalidQuantityText));

      expect(result.data.wasteQuantity).toBeUndefined();
    });

    it('should handle waste quantity with NaN result', () => {
      // Use dots that match [\d.,]+ pattern but parse to NaN
      const nanQuantityText = `
CDF Nº: 123456789
Data de Emissão: 15/03/2024
Quantidade Total: ... kg
`;

      const result = parser.parse(buildExtractionResult(nanQuantityText));

      expect(result.data.wasteQuantity).toBeUndefined();
    });

    it('should handle section extraction with consecutive sections', () => {
      // Text that triggers section parsing with sections directly following each other
      const consecutiveSectionsText = `
CDF Nº: 123456789
Data de Emissão: 15/03/2024

Gerador
EMPRESA GERADORA LTDA
CNPJ: 12.345.678/0001-90
Processador
`;

      const result = parser.parse(
        buildExtractionResult(consecutiveSectionsText),
      );

      expect(result.data.generator.parsed.name).toBe('EMPRESA GERADORA LTDA');
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid CDF text', () => {
      const score = parser.getMatchScore(buildExtractionResult(validCdfText));

      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for non-CDF text', () => {
      const irrelevantText = 'This is a random document with no CDF patterns';
      const score = parser.getMatchScore(buildExtractionResult(irrelevantText));

      expect(score).toBeLessThan(0.3);
    });

    it('should return medium score for partial CDF text', () => {
      const partialCdfText = `
        Certificado de Destinação
        Resíduo tratado
      `;
      const score = parser.getMatchScore(buildExtractionResult(partialCdfText));

      expect(score).toBeGreaterThanOrEqual(0.1);
      expect(score).toBeLessThan(0.6);
    });
  });

  describe('metadata', () => {
    it('should have correct document type and layout id', () => {
      expect(parser.documentType).toBe('recyclingManifest');
      expect(parser.layoutId).toBe('cdf-brazil');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
