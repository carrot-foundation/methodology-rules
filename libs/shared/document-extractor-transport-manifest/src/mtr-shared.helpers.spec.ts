import { clearRegistry } from '@carrot-fndn/shared/document-extractor';

import {
  extractAddressFields,
  extractDriverAndVehicle,
  extractMtrEntityWithAddress,
  finalizeMtrExtraction,
  MTR_DEFAULT_PATTERNS,
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
        stripTrailingRegistrationNumber('COMPOST VERDE LTDA. - 112752'),
      ).toBe('COMPOST VERDE LTDA.');
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
        'Endereco: Rua Industrial, nº S/N',
        'Municipio: Cidade Interior',
        'UF: RS',
      ].join('\n');

      expect(extractAddressFields(section)).toEqual({
        address: 'Rua Industrial, nº S/N',
        city: 'Cidade Interior',
        state: 'RS',
      });
    });

    it('should handle Estado variant for state', () => {
      const section = [
        'Endereco: Av. Principal, 500',
        'Municipio: Sao Paulo',
        'Estado: SP',
      ].join('\n');

      expect(extractAddressFields(section)).toEqual({
        address: 'Av. Principal, 500',
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
        'CARLOS OLIVEIRA DOS SANTOS',
        'FKE1A23',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'CARLOS OLIVEIRA DOS SANTOS',
        vehiclePlate: 'FKE1A23',
      });
    });

    it('should extract when plate appears before driver name in values', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'HIJ3K56',
        'Rafael Silva',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Rafael Silva',
        vehiclePlate: 'HIJ3K56',
      });
    });

    it('should filter boilerplate lines', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'PEDRO ALMEIDA',
        'FKE2B34',
        'nome e assinatura do responsavel',
        'cargo',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'PEDRO ALMEIDA',
        vehiclePlate: 'FKE2B34',
      });
    });

    it('should extract only driver name when only driver label is present', () => {
      const section = ['Nome do Motorista', 'ANA FERREIRA'].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'ANA FERREIRA',
      });
    });

    it('should return empty when only driver label present but no valid name lines', () => {
      const section = ['Nome do Motorista', ''].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({});
    });

    it('should extract only plate when only plate label is present', () => {
      const section = ['Placa do Veiculo', 'FKE2B34'].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        vehiclePlate: 'FKE2B34',
      });
    });

    it('should return empty when only plate label present but no matching plate', () => {
      const section = ['Placa do Veiculo', ''].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({});
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
        'PEDRO ALMEIDA',
        'HIJ 3/56',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'PEDRO ALMEIDA',
        vehiclePlate: 'HIJ 3/56',
      });
    });

    it('should extract inline values (label: value on same line)', () => {
      const section = [
        'Motorista: Pedro Santos',
        'Placa do Veiculo: ABC1D23',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Pedro Santos',
        vehiclePlate: 'ABC1D23',
      });
    });

    it('should extract inline driver with "Motorista" label variant', () => {
      const section = 'Motorista: Andre Ferreira';

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Andre Ferreira',
      });
    });

    it('should extract inline plate only when no driver label is present', () => {
      const section = 'Placa do Veiculo: ABC1D23';

      expect(extractDriverAndVehicle(section)).toEqual({
        vehiclePlate: 'ABC1D23',
      });
    });

    it('should extract only plate when both labels present but no name-like value', () => {
      const section = ['Nome do Motorista', 'Placa do Veiculo', 'FKE2B34'].join(
        '\n',
      );

      expect(extractDriverAndVehicle(section)).toEqual({
        vehiclePlate: 'FKE2B34',
      });
    });

    it('should not assign driverName when single value matches neither name nor plate pattern', () => {
      const section = ['Nome do Motorista', 'Placa do Veiculo', '12345'].join(
        '\n',
      );

      expect(extractDriverAndVehicle(section)).toEqual({});
    });

    it('should extract name with trailing period', () => {
      const section = ['Nome do Motorista', 'ALEX .'].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'ALEX .',
      });
    });

    it('should extract name with trailing quotes', () => {
      const section = ['Nome do Motorista', "MARCOS ANTONIO '''"].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: "MARCOS ANTONIO '''",
      });
    });

    it('should extract name with hyphen', () => {
      const section = ['Nome do Motorista', 'JEAN-PIERRE SILVA'].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'JEAN-PIERRE SILVA',
      });
    });

    it('should extract short name (>= 2 chars)', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'MAX',
        'LMN4P78',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'MAX',
        vehiclePlate: 'LMN4P78',
      });
    });

    it('should extract name with trailing comma', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'MARCOS ANTONIO DOS SANTOS,',
        'PQR5S12',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'MARCOS ANTONIO DOS SANTOS,',
        vehiclePlate: 'PQR5S12',
      });
    });

    it('should not treat "motoristateste" as a driver label', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'motoristateste',
        'TUV6W34',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'motoristateste',
        vehiclePlate: 'TUV6W34',
      });
    });

    it('should extract name with CPF appended as full string', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'Marcos Pereira Lima CPF: 111.222.333-44',
        'WXY7Z56',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Marcos Pereira Lima CPF: 111.222.333-44',
        vehiclePlate: 'WXY7Z56',
      });
    });

    it('should extract plate-concatenated name as full string', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'TUV6W34Fernando Mendes Oliveira',
        'TUV6W34',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'TUV6W34Fernando Mendes Oliveira',
        vehiclePlate: 'TUV6W34',
      });
    });

    it('should extract MTR number as driverName when plate is identified', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        '224133585',
        'JKL8M90',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: '224133585',
        vehiclePlate: 'JKL8M90',
      });
    });

    it('should fallback to first value line when only driver label present and findNameLine fails', () => {
      const section = [
        'Nome do Motorista',
        'Marcos Pereira Lima CPF: 111.222.333-44',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'Marcos Pereira Lima CPF: 111.222.333-44',
      });
    });

    it('should not treat short ambiguous word as driverName when it is the only value', () => {
      const section = ['Nome do Motorista', 'Placa do Veiculo', 'SEM'].join(
        '\n',
      );

      expect(extractDriverAndVehicle(section)).toEqual({});
    });

    it('should extract long single name when both labels present', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'PEDRO ALMEIDA',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: 'PEDRO ALMEIDA',
      });
    });

    it('should ignore single-char placeholder as driverName', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        '-',
        '00000',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({});
    });

    it('should extract numeric value as driverName when boilerplate is filtered', () => {
      const section = [
        'Nome do Motorista',
        'Placa do Veiculo',
        'assinatura do responsavel',
        '411022658160',
        'NOP9Q12',
      ].join('\n');

      expect(extractDriverAndVehicle(section)).toEqual({
        driverName: '411022658160',
        vehiclePlate: 'NOP9Q12',
      });
    });
  });

  describe('extractMtrEntityWithAddress', () => {
    const sectionPatterns = {
      generator: /^\s*(?:Identificacao\s+do\s+)?(?:Gerador|Origem)\s*$/i,
      hauler: /^\s*(?:Identificacao\s+do\s+)?(?:Transportador)\s*$/i,
      receiver:
        /^\s*(?:Identificacao\s+do\s+)?(?:Destinatario|Destinador|Receptor)\s*$/i,
    };
    const allSectionPatterns = Object.values(sectionPatterns);
    const brazilianTaxIdPattern = MTR_DEFAULT_PATTERNS.brazilianTaxId;

    it('should extract entity with address and strip registration number', () => {
      const text = [
        'Gerador',
        'EMPRESA GERADORA LTDA 262960',
        'CNPJ: 12.345.678/0001-90',
        'Endereco: Rua Test, 100',
        'Municipio: Cidade Interior',
        'UF: RS',
        '',
        'Transportador',
      ].join('\n');

      const result = extractMtrEntityWithAddress(
        text,
        sectionPatterns.generator,
        allSectionPatterns,
        brazilianTaxIdPattern,
      );

      expect(result.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.name.confidence).toBe('high');
      expect(result.taxId.parsed).toBe('12.345.678/0001-90');
      expect(result.address.parsed).toBe('Rua Test, 100');
      expect(result.city.parsed).toBe('Cidade Interior');
      expect(result.state.parsed).toBe('RS');
    });

    it('should return low confidence when entity is not found', () => {
      const result = extractMtrEntityWithAddress(
        'Random text without sections',
        sectionPatterns.generator,
        allSectionPatterns,
        brazilianTaxIdPattern,
      );

      expect(result.name.confidence).toBe('low');
      expect(result.taxId.confidence).toBe('low');
      expect(result.address.confidence).toBe('low');
    });

    it('should normalize CNPJ with OCR-inserted spaces', () => {
      const text = [
        'Gerador',
        'EMPRESA GERADORA LTDA',
        'CNPJ: 10.111. 222/0002-55',
        'Endereco: Rua Test, 100',
        'Municipio: Cidade Interior',
        'UF: RS',
        '',
        'Transportador',
      ].join('\n');

      const result = extractMtrEntityWithAddress(
        text,
        sectionPatterns.generator,
        allSectionPatterns,
        brazilianTaxIdPattern,
      );

      expect(result.taxId.parsed).toBe('10.111.222/0002-55');
      expect(result.taxId.confidence).toBe('high');
      expect(result.name.parsed).toBe('EMPRESA GERADORA LTDA');
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
        sectionPatterns.generator,
        allSectionPatterns,
        brazilianTaxIdPattern,
      );

      expect(result.name.parsed).toBe('EMPRESA GERADORA LTDA');
      expect(result.name.confidence).toBe('high');
      expect(result.address.parsed).toBe('');
      expect(result.address.confidence).toBe('low');
    });
  });

  describe('finalizeMtrExtraction', () => {
    it('should return extraction output with review required for low match score', () => {
      const result = finalizeMtrExtraction(
        {
          documentType: 'transportManifest',
          rawText: 'test' as never,
        },
        0.4,
        'test',
      );

      expect(result.data.documentType).toBe('transportManifest');
      expect(result.reviewRequired).toBe(true);
      expect(
        result.reviewReasons.some((r) => r.code === 'LOW_LAYOUT_MATCH_SCORE'),
      ).toBe(true);
    });
  });
});
