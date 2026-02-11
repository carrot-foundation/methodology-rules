import { clearRegistry } from '@carrot-fndn/shared/document-extractor';

import {
  extractAddressFields,
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
        'Razão Social: Test Company',
        'Endereço: Rua Empresário Agenello Senger, nº S/N',
        'Município: Carazinho',
        'UF: RS',
      ].join('\n');

      expect(extractAddressFields(section)).toEqual({
        address: 'Rua Empresário Agenello Senger, nº S/N',
        city: 'Carazinho',
        state: 'RS',
      });
    });

    it('should handle Estado variant for state', () => {
      const section = [
        'Endereço: Av. Brasil, 500',
        'Município: São Paulo',
        'Estado: SP',
      ].join('\n');

      expect(extractAddressFields(section)).toEqual({
        address: 'Av. Brasil, 500',
        city: 'São Paulo',
        state: 'SP',
      });
    });

    it('should return undefined when address is missing', () => {
      expect(extractAddressFields('Município: City\nUF: SP')).toBeUndefined();
    });

    it('should return undefined when city is missing', () => {
      expect(
        extractAddressFields('Endereço: Rua Test\nUF: SP'),
      ).toBeUndefined();
    });

    it('should return undefined when state is missing', () => {
      expect(
        extractAddressFields('Endereço: Rua Test\nMunicípio: City'),
      ).toBeUndefined();
    });
  });

  describe('extractMtrEntityWithAddress', () => {
    const sectionPatterns = {
      destinatario:
        /^\s*(?:Identifica[çc][ãa]o\s+do\s+)?(?:Destinat[áa]rio|Destinador|Receptor)\s*$/i,
      gerador: /^\s*(?:Identifica[çc][ãa]o\s+do\s+)?(?:Gerador|Origem)\s*$/i,
      transportador:
        /^\s*(?:Identifica[çc][ãa]o\s+do\s+)?(?:Transportador)\s*$/i,
    };
    const allSectionPatterns = Object.values(sectionPatterns);
    // eslint-disable-next-line sonarjs/slow-regex
    const cnpjPattern = /CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi;

    it('should extract entity with address and strip registration number', () => {
      const text = [
        'Gerador',
        'EMPRESA GERADORA LTDA 262960',
        'CNPJ: 12.345.678/0001-90',
        'Endereço: Rua Test, 100',
        'Município: Carazinho',
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
