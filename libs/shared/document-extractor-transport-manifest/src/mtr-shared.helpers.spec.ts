import { clearRegistry } from '@carrot-fndn/shared/document-extractor';

import {
  extractAddressFields,
  extractDriverAndVehicle,
  extractMtrEntityWithAddress,
  finalizeMtrExtraction,
  stripTrailingRegistrationNumber,
} from './mtr-shared.helpers';

describe('MTR shared helpers', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('stripTrailingRegistrationNumber', () => {
    it('should strip trailing numeric registration number', () => {
      expect(stripTrailingRegistrationNumber('EMPRESA LTDA 262960')).toBe(
        'EMPRESA LTDA',
      );
    });

    it('should strip trailing registration number with dash', () => {
      expect(
        stripTrailingRegistrationNumber('COMPOSTAMAIS LTDA. - 112752'),
      ).toBe('COMPOSTAMAIS LTDA.');
    });

    it('should strip trailing registration number with en-dash', () => {
      expect(stripTrailingRegistrationNumber('COMPANY NAME – 596')).toBe(
        'COMPANY NAME',
      );
    });

    it('should not modify name without trailing number', () => {
      expect(stripTrailingRegistrationNumber('EMPRESA LTDA')).toBe(
        'EMPRESA LTDA',
      );
    });

    it('should trim whitespace', () => {
      expect(stripTrailingRegistrationNumber('  EMPRESA LTDA  ')).toBe(
        'EMPRESA LTDA',
      );
    });
  });

  describe('extractAddressFields', () => {
    it('should extract address, city, and state from section text', () => {
      const section = [
        'Razao Social: Test Company',
        'Endereco: Rua Empresario Agenello Senger, nº S/N',
        'Municipio: Carazinho',
        'UF: RS',
      ].join('\n');

      expect(extractAddressFields(section)).toEqual({
        address: 'Rua Empresario Agenello Senger, nº S/N',
        city: 'Carazinho',
        state: 'RS',
      });
    });

    it('should handle Estado variant for state', () => {
      const section = [
        'Endereco: Av. Brasil, 500',
        'Municipio: Sao Paulo',
        'Estado: SP',
      ].join('\n');

      expect(extractAddressFields(section)).toEqual({
        address: 'Av. Brasil, 500',
        city: 'Sao Paulo',
        state: 'SP',
      });
    });

    it('should return undefined when address is missing', () => {
      expect(extractAddressFields('Municipio: City\nUF: SP')).toBeUndefined();
    });

    it('should return undefined when city is missing', () => {
      expect(
        extractAddressFields('Endereco: Rua Test\nUF: SP'),
      ).toBeUndefined();
    });

    it('should return undefined when state is missing', () => {
      expect(
        extractAddressFields('Endereco: Rua Test\nMunicipio: City'),
      ).toBeUndefined();
    });
  });

  describe('extractDriverAndVehicle', () => {
    it('should extract driver name and plate when both labels present (driver first, then plate)', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'GERSON PEREIRA DA SILVA',
        'AUP5E49',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'GERSON PEREIRA DA SILVA',
        vehiclePlate: 'AUP5E49',
      });
    });

    it('should extract when plate appears before driver name in values', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'NKW1862',
        'Rafael Silva',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Rafael Silva',
        vehiclePlate: 'NKW1862',
      });
    });

    it('should filter boilerplate lines', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'CARLOS SILVA',
        'BRA2E19',
        'nome e assinatura do responsavel',
        'cargo',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'CARLOS SILVA',
        vehiclePlate: 'BRA2E19',
      });
    });

    it('should extract only driver name when only driver label is present', () => {
      const section = ['Nome do Motorista', 'MARIA SANTOS'].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'MARIA SANTOS',
      });
    });

    it('should extract only plate when only plate label is present', () => {
      const section = ['Placa do Veiculo', 'BRA2E19'].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        vehiclePlate: 'BRA2E19',
      });
    });

    it('should return empty when no labels are found', () => {
      expect(extractDriverAndVehicle('Random text')).toEqual({});
    });

    it('should return empty when labels have no following values', () => {
      const section = ['Nome do Motorista', 'Placa do Veiculo', ''].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({});
    });

    it('should handle Mercosul plate format', () => {
      const section = ['Placa do Veiculo', 'ABC1D23'].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        vehiclePlate: 'ABC1D23',
      });
    });

    it('should accept OCR-mangled plate when driver name is identified', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'CARLOS SILVA',
        'NKW 1/62',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'CARLOS SILVA',
        vehiclePlate: 'NKW 1/62',
      });
    });

    it('should extract inline values (label: value on same line)', () => {
      const section = [
        'Motorista: Joao da Silva',
        'Placa do Veiculo: ABC1D23',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Joao da Silva',
        vehiclePlate: 'ABC1D23',
      });
    });

    it('should extract inline driver with "Motorista" label variant', () => {
      const section = 'Motorista: Carlos Santos';

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Carlos Santos',
      });
    });

    it('should extract only plate when both labels present but no name-like value', () => {
      const section = ['Nome do Motorista', 'Placa do Veiculo', 'BRA2E19'].join(
        '\n',
      );

      expect(extractDriverAndVehicle(section)).toEqual({
        vehiclePlate: 'BRA2E19',
      });
    });

    it('should return empty when both labels present but only non-name non-plate values', () => {
      const section = ['Nome do Motorista', 'Placa do Veiculo', '12345'].join(
        '\n',
      );

      expect(extractDriverAndVehicle(section)).toEqual({});
    });
  });

  describe('extractMtrEntityWithAddress', () => {
    const sectionPatterns = {
      destinatario:
        /^\s*(?:Identificacao\s+do\s+)?(?:Destinatario|Destinador|Receptor)\s*$/i,
      gerador: /^\s*(?:Identificacao\s+do\s+)?(?:Gerador|Origem)\s*$/i,
      transportador: /^\s*(?:Identificacao\s+do\s+)?(?:Transportador)\s*$/i,
    };
    const allSectionPatterns = Object.values(sectionPatterns);
    // eslint-disable-next-line sonarjs/slow-regex
    const cnpjPattern = /CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi;

    it('should extract entity with address and strip registration number', () => {
      const text = [
        'Gerador',
        'EMPRESA GERADORA LTDA 262960',
        'CNPJ: 12.345.678/0001-90',
        'Endereco: Rua Test, 100',
        'Municipio: Carazinho',
        'UF: RS',
        '',
        'Transportador',
      ].join('\n');

      const result = extractMtrEntityWithAddress(
        text,
        sectionPatterns.gerador,
        allSectionPatterns,
        cnpjPattern,
      );

      expect(result.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.name.confidence).toBe('high');
      expect(result.taxId.parsed).toBe('12.345.678/0001-90');
      expect(result.address.parsed).toBe('Rua Test, 100');
      expect(result.city.parsed).toBe('Carazinho');
      expect(result.state.parsed).toBe('RS');
    });

    it('should return low confidence when entity is not found', () => {
      const result = extractMtrEntityWithAddress(
        'Random text without sections',
        sectionPatterns.gerador,
        allSectionPatterns,
        cnpjPattern,
      );

      expect(result.name.confidence).toBe('low');
      expect(result.taxId.confidence).toBe('low');
      expect(result.address.confidence).toBe('low');
    });

    it('should return low confidence address when entity has no address', () => {
      const text = [
        'Gerador',
        'EMPRESA GERADORA LTDA',
        'CNPJ: 12.345.678/0001-90',
        '',
        'Transportador',
      ].join('\n');

      const result = extractMtrEntityWithAddress(
        text,
        sectionPatterns.gerador,
        allSectionPatterns,
        cnpjPattern,
      );

      expect(result.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.name.confidence).toBe('high');
      expect(result.address.parsed).toBe('');
      expect(result.address.confidence).toBe('low');
    });
  });

  describe('finalizeMtrExtraction', () => {
    it('should return extraction output with review required when fields are missing', () => {
      const result = finalizeMtrExtraction(
        {
          documentType: 'transportManifest',
          rawText: 'test' as never,
        },
        0.5,
        'test',
      );

      expect(result.data.documentType).toBe('transportManifest');
      expect(result.reviewRequired).toBe(true);
      expect(result.data.missingRequiredFields.length).toBeGreaterThan(0);
    });
  });
});
