import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { MtrCetesbSpParser } from './mtr-cetesb-sp.parser';

describe('MtrCetesbSpParser', () => {
  const parser = new MtrCetesbSpParser();

  beforeEach(() => {
    clearRegistry();
  });

  const validCetesbText = [
    'Manifesto de Transporte de Resíduos MTR',
    'MTR n° 240001460711',
    'CETESB',
    '',
    'Identificação do Gerador',
    'Razão Social: Ajinomoto do Brasil Indústria e Comércio de Alimentos Ltda 2845',
    'CPF/CNPJ: 46.344.354/0005-88',
    'Data da emissão: 08/07/2024',
    '',
    'Identificação do Transportador',
    'Razão Social: RECICLADOS LIMEIRA LTDA 5193',
    'CPF/CNPJ: 04.359.529/0001-57',
    'Nome do Motorista',
    'Placa do Veículo',
    'GERSON PEREIRA DA SILVA',
    'AUP5E49',
    '',
    'Identificação do Destinador',
    'Razão Social: TERA AMBIENTAL LTDA. - 596',
    'CPF/CNPJ: 59.591.115/0003-02',
    '',
    'Identificação dos Resíduos',
    'IBAMA',
    '190812-Lodos de tratamento biológico de águas residuárias',
    'CLASSE',
    'IIA',
    '13,4700 TON',
  ].join('\n');

  describe('parse', () => {
    it('should parse a valid CETESB MTR document with high confidence', () => {
      const result = parser.parse(stubTextExtractionResult(validCetesbText));

      expect(result.data.documentNumber.parsed).toBe('240001460711');
      expect(result.data.documentNumber.confidence).toBe('high');
      expect(result.data.issueDate.parsed).toBe('08/07/2024');
      expect(result.data.issueDate.confidence).toBe('high');
      expect(result.data.generator.parsed.name).toBe(
        'Ajinomoto do Brasil Indústria e Comércio de Alimentos Ltda',
      );
      expect(result.data.generator.parsed.taxId).toBe('46.344.354/0005-88');
      expect(result.data.generator.confidence).toBe('high');
      expect(result.data.transporter.parsed.name).toBe(
        'RECICLADOS LIMEIRA LTDA',
      );
      expect(result.data.transporter.parsed.taxId).toBe('04.359.529/0001-57');
      expect(result.data.receiver.parsed.name).toBe('TERA AMBIENTAL LTDA.');
      expect(result.data.receiver.parsed.taxId).toBe('59.591.115/0003-02');
      expect(result.data.driverName?.parsed).toBe('GERSON PEREIRA DA SILVA');
      expect(result.data.vehiclePlate?.parsed).toBe('AUP5E49');
      expect(result.data.wasteType?.parsed).toBe(
        '190812-Lodos de tratamento biológico de águas residuárias',
      );
      expect(result.data.wasteClassification?.parsed).toBe('IIA');
      expect(result.data.wasteQuantity?.parsed).toBe(13.47);
      expect(result.data.documentType).toBe('transportManifest');
      expect(result.reviewRequired).toBe(false);
    });

    it('should set reviewRequired when required fields are missing', () => {
      const incompleteText = [
        'Manifesto de Transporte de Resíduos MTR',
        'CETESB',
        'Identificação do Gerador',
        'Razão Social: Some Company',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(incompleteText));

      expect(result.reviewRequired).toBe(true);
      expect(result.data.missingRequiredFields).toContain('documentNumber');
      expect(result.data.missingRequiredFields).toContain('issueDate');
      expect(result.reviewReasons.length).toBeGreaterThan(0);
    });

    it('should set low confidence for entities with missing CPF/CNPJ', () => {
      const noCnpjText = [
        'MTR n° 999888777',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Gerador',
        'Razão Social: EMPRESA SEM CNPJ',
        '',
        'Identificação do Transportador',
        'Razão Social: TRANSPORTE SEM CNPJ',
        '',
        'Identificação do Destinador',
        'Razão Social: DESTINO SEM CNPJ',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noCnpjText));

      expect(result.data.generator.confidence).toBe('low');
      expect(result.data.transporter.confidence).toBe('low');
      expect(result.data.receiver.confidence).toBe('low');
      expect(result.data.extractionConfidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should strip trailing registration numbers from Razão Social', () => {
      const textWithRegistrationNumbers = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Gerador',
        'Razão Social: Empresa Alpha Ltda 2845',
        'CPF/CNPJ: 12.345.678/0001-90',
        '',
        'Identificação do Transportador',
        'Razão Social: Beta Transportes SA 5193',
        'CPF/CNPJ: 98.765.432/0001-10',
        '',
        'Identificação do Destinador',
        'Razão Social: Gama Reciclagem LTDA. - 596',
        'CPF/CNPJ: 11.222.333/0001-44',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResult(textWithRegistrationNumbers),
      );

      expect(result.data.generator.parsed.name).toBe('Empresa Alpha Ltda');
      expect(result.data.transporter.parsed.name).toBe('Beta Transportes SA');
      expect(result.data.receiver.parsed.name).toBe('Gama Reciclagem LTDA.');
    });

    it('should extract driver name and vehicle plate from grouped label-value pattern', () => {
      const labelValueText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Gerador',
        'Razão Social: Test Company',
        'CPF/CNPJ: 12.345.678/0001-90',
        '',
        'Identificação do Transportador',
        'Razão Social: Transport Co',
        'CPF/CNPJ: 98.765.432/0001-10',
        'Nome do Motorista',
        'Placa do Veículo',
        'CARLOS SILVA',
        'BRA2E19',
        '',
        'Identificação do Destinador',
        'Razão Social: Receiver Co',
        'CPF/CNPJ: 11.222.333/0001-44',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(labelValueText));

      expect(result.data.driverName?.parsed).toBe('CARLOS SILVA');
      expect(result.data.vehiclePlate?.parsed).toBe('BRA2E19');
    });

    it('should not extract driver name when labels have no following values', () => {
      const noValueText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Transportador',
        'Razão Social: Transport Co',
        'CPF/CNPJ: 98.765.432/0001-10',
        'Nome do Motorista',
        'Placa do Veículo',
        '',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noValueText));

      expect(result.data.driverName).toBeUndefined();
      expect(result.data.vehiclePlate).toBeUndefined();
    });

    it('should not extract vehicle plate when value is not a valid plate format', () => {
      const invalidPlateText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Transportador',
        'Razão Social: Transport Co',
        'CPF/CNPJ: 98.765.432/0001-10',
        'Nome do Motorista',
        'Placa do Veículo',
        'CARLOS SILVA',
        'NOT A PLATE',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(invalidPlateText));

      expect(result.data.driverName?.parsed).toBe('CARLOS SILVA');
      expect(result.data.vehiclePlate).toBeUndefined();
    });

    it('should extract driver name when only driver label is present', () => {
      const onlyDriverText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Transportador',
        'Razão Social: Transport Co',
        'CPF/CNPJ: 98.765.432/0001-10',
        'Nome do Motorista',
        'MARIA SANTOS',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(onlyDriverText));

      expect(result.data.driverName?.parsed).toBe('MARIA SANTOS');
    });

    it('should extract vehicle plate when only plate label is present', () => {
      const onlyPlateText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Transportador',
        'Razão Social: Transport Co',
        'CPF/CNPJ: 98.765.432/0001-10',
        'Placa do Veículo',
        'BRA2E19',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(onlyPlateText));

      expect(result.data.vehiclePlate?.parsed).toBe('BRA2E19');
      expect(result.data.driverName).toBeUndefined();
    });

    it('should set low confidence for entity with CPF/CNPJ but no Razão Social', () => {
      const noCnpjNoRazaoText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Gerador',
        'CPF/CNPJ: 12.345.678/0001-90',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noCnpjNoRazaoText));

      expect(result.data.generator.confidence).toBe('low');
    });

    it('should extract waste classification split across lines', () => {
      const splitClassText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação dos Resíduos',
        'CLASSE',
        'IIA',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(splitClassText));

      expect(result.data.wasteClassification?.parsed).toBe('IIA');
    });

    it('should convert Brazilian number format for waste quantity', () => {
      const quantityText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação dos Resíduos',
        '13,4700 TON',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(quantityText));

      expect(result.data.wasteQuantity?.parsed).toBe(13.47);
    });

    it('should not extract waste quantity when value is NaN', () => {
      const nanQuantityText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação dos Resíduos',
        '... TON',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(nanQuantityText));

      expect(result.data.wasteQuantity).toBeUndefined();
    });

    it('should handle entity with Razão Social but no valid name after stripping', () => {
      const shortNameText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Gerador',
        'Razão Social: AB 123',
        'CPF/CNPJ: 12.345.678/0001-90',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(shortNameText));

      expect(result.data.generator.confidence).toBe('low');
    });

    it('should extract waste fields from full text when waste section is missing', () => {
      const noWasteSectionText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '190812-Lodos de tratamento biológico',
        'CLASSE',
        'IIB',
        '5,0000 TON',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noWasteSectionText));

      expect(result.data.wasteType?.parsed).toBe(
        '190812-Lodos de tratamento biológico',
      );
      expect(result.data.wasteClassification?.parsed).toBe('IIB');
      expect(result.data.wasteQuantity?.parsed).toBe(5);
    });

    it('should not extract transporter fields when transporter section is missing', () => {
      const noTransporterText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
        '',
        'Identificação do Gerador',
        'Razão Social: Company',
        'CPF/CNPJ: 12.345.678/0001-90',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noTransporterText));

      expect(result.data.driverName).toBeUndefined();
      expect(result.data.vehiclePlate).toBeUndefined();
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid CETESB MTR text', () => {
      const score = parser.getMatchScore(
        stubTextExtractionResult(validCetesbText),
      );

      expect(score).toBeGreaterThanOrEqual(0.8);
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
      expect(parser.layoutId).toBe('mtr-cetesb-sp');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
