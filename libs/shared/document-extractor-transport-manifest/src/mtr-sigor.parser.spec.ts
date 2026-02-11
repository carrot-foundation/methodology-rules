import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import {
  stubTextExtractionResult,
  stubTextExtractionResultWithBlocks,
} from '@carrot-fndn/shared/text-extractor';

import { MtrSigorParser } from './mtr-sigor.parser';

const stubBoundingBox = (left: number, top: number) => ({
  height: 0.015,
  left,
  top,
  width: 0.1,
});

describe('MtrSigorParser', () => {
  const parser = new MtrSigorParser();

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
    'Endereço: Rua Vergueiro, 1855',
    'Município: Limeira',
    'UF: SP',
    'Data da emissão: 08/07/2024',
    'Data do transporte: 09/07/2024',
    'Data do recebimento: 10/07/2024',
    '',
    'Identificação do Transportador',
    'Razão Social: RECICLADOS LIMEIRA LTDA 5193',
    'CPF/CNPJ: 04.359.529/0001-57',
    'Endereço: Av. Paulista, 1000',
    'Município: São Paulo',
    'Estado: SP',
    'Nome do Motorista',
    'Placa do Veículo',
    'GERSON PEREIRA DA SILVA',
    'AUP5E49',
    '',
    'Identificação do Destinador',
    'Razão Social: TERA AMBIENTAL LTDA. - 596',
    'CPF/CNPJ: 59.591.115/0003-02',
    'Endereço: Rod. SP-101, Km 5',
    'Município: Paulínia',
    'UF: SP',
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
      const result = parser.parse(
        stubTextExtractionResultWithBlocks(validCetesbText, [
          { boundingBox: stubBoundingBox(0.048, 0.35), text: 'Item' },
          {
            boundingBox: stubBoundingBox(0.098, 0.35),
            text: 'Código IBAMA e Denominação',
          },
          { boundingBox: stubBoundingBox(0.474, 0.35), text: 'Estado Físico' },
          { boundingBox: stubBoundingBox(0.567, 0.35), text: 'Classe' },
          {
            boundingBox: stubBoundingBox(0.624, 0.35),
            text: 'Acondicionamento',
          },
          { boundingBox: stubBoundingBox(0.767, 0.35), text: 'Qtde' },
          { boundingBox: stubBoundingBox(0.823, 0.35), text: 'Unidade' },
          { boundingBox: stubBoundingBox(0.886, 0.35), text: 'Tratamento' },
          { boundingBox: stubBoundingBox(0.048, 0.4), text: '1' },
          {
            boundingBox: stubBoundingBox(0.098, 0.4),
            text: '190812-Lodos de tratamento biológico de águas residuárias',
          },
          { boundingBox: stubBoundingBox(0.474, 0.4), text: 'SEMISSÓLIDO' },
          { boundingBox: stubBoundingBox(0.567, 0.4), text: 'CLASSE IIA' },
          { boundingBox: stubBoundingBox(0.624, 0.4), text: 'CAÇAMBA ABERTA' },
          { boundingBox: stubBoundingBox(0.767, 0.4), text: '13,4700' },
          { boundingBox: stubBoundingBox(0.823, 0.4), text: 'TON' },
          { boundingBox: stubBoundingBox(0.886, 0.4), text: 'Compostagem' },
        ]),
      );

      expect(result.data.documentNumber.parsed).toBe('240001460711');
      expect(result.data.documentNumber.confidence).toBe('high');
      expect(result.data.issueDate.parsed).toBe('08/07/2024');
      expect(result.data.issueDate.confidence).toBe('high');
      expect(result.data.generator.name.parsed).toBe(
        'Ajinomoto do Brasil Industria e Comercio de Alimentos Ltda',
      );
      expect(result.data.generator.taxId.parsed).toBe('46.344.354/0005-88');
      expect(result.data.generator.address.parsed).toBe('Rua Vergueiro, 1855');
      expect(result.data.generator.city.parsed).toBe('Limeira');
      expect(result.data.generator.state.parsed).toBe('SP');
      expect(result.data.generator.name.confidence).toBe('high');
      expect(result.data.hauler.name.parsed).toBe('RECICLADOS LIMEIRA LTDA');
      expect(result.data.hauler.taxId.parsed).toBe('04.359.529/0001-57');
      expect(result.data.hauler.address.parsed).toBe('Av. Paulista, 1000');
      expect(result.data.hauler.city.parsed).toBe('Sao Paulo');
      expect(result.data.hauler.state.parsed).toBe('SP');
      expect(result.data.receiver.name.parsed).toBe('TERA AMBIENTAL LTDA.');
      expect(result.data.receiver.taxId.parsed).toBe('59.591.115/0003-02');
      expect(result.data.receiver.address.parsed).toBe('Rod. SP-101, Km 5');
      expect(result.data.receiver.city.parsed).toBe('Paulinia');
      expect(result.data.receiver.state.parsed).toBe('SP');
      expect(result.data.driverName?.parsed).toBe('GERSON PEREIRA DA SILVA');
      expect(result.data.vehiclePlate?.parsed).toBe('AUP5E49');
      expect(result.data.wasteTypes?.parsed).toEqual([
        {
          classification: 'CLASSE IIA',
          code: '190812',
          description: 'Lodos de tratamento biológico de águas residuárias',
          quantity: 13.47,
          unit: 'TON',
        },
      ]);
      expect(result.data.transportDate?.parsed).toBe('09/07/2024');
      expect(result.data.receivingDate?.parsed).toBe('10/07/2024');
      expect(result.data.documentType).toBe('transportManifest');
      expect(result.reviewRequired).toBe(false);
    });

    it('should parse entities without address fields', () => {
      const noAddressText = [
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
        '',
        'Identificação do Destinador',
        'Razão Social: Receiver Co',
        'CPF/CNPJ: 11.222.333/0001-44',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(noAddressText));

      expect(result.data.generator.name.parsed).toBe('Test Company');
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

      expect(result.data.generator.name.confidence).toBe('low');
      expect(result.data.hauler.name.confidence).toBe('low');
      expect(result.data.receiver.name.confidence).toBe('low');
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

      expect(result.data.generator.name.parsed).toBe('Empresa Alpha Ltda');
      expect(result.data.hauler.name.parsed).toBe('Beta Transportes SA');
      expect(result.data.receiver.name.parsed).toBe('Gama Reciclagem LTDA.');
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

      expect(result.data.driverName?.parsed).toBe('');
      expect(result.data.driverName?.confidence).toBe('low');
      expect(result.data.vehiclePlate?.parsed).toBe('');
      expect(result.data.vehiclePlate?.confidence).toBe('low');
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
      expect(result.data.vehiclePlate?.parsed).toBe('');
      expect(result.data.vehiclePlate?.confidence).toBe('low');
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

      expect(result.data.generator.name.confidence).toBe('low');
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

      expect(result.data.generator.name.confidence).toBe('low');
    });

    it('should mark date fields as low confidence when label is present but value is empty', () => {
      const emptyDatesText = [
        'MTR n° 123456',
        'Data da emissão:',
        'Data do transporte:',
        'Data do recebimento:',
        'CETESB',
      ].join('\n');

      const result = parser.parse(stubTextExtractionResult(emptyDatesText));

      expect(result.data.issueDate.parsed).toBe('');
      expect(result.data.issueDate.confidence).toBe('low');
      expect(result.data.transportDate?.parsed).toBe('');
      expect(result.data.transportDate?.confidence).toBe('low');
      expect(result.data.receivingDate?.parsed).toBe('');
      expect(result.data.receivingDate?.confidence).toBe('low');
    });

    it('should not extract hauler fields when hauler section is missing', () => {
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

  describe('coordinate-based waste extraction', () => {
    it('should extract waste fields with continuation rows', () => {
      const rawText = [
        'MTR n° 240001460711',
        'Data da emissão: 08/07/2024',
        'CETESB',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          { boundingBox: stubBoundingBox(0.048, 0.35), text: 'Item' },
          {
            boundingBox: stubBoundingBox(0.098, 0.35),
            text: 'Código IBAMA e Denominação',
          },
          { boundingBox: stubBoundingBox(0.474, 0.35), text: 'Estado Físico' },
          { boundingBox: stubBoundingBox(0.567, 0.35), text: 'Classe' },
          {
            boundingBox: stubBoundingBox(0.624, 0.35),
            text: 'Acondicionamento',
          },
          { boundingBox: stubBoundingBox(0.767, 0.35), text: 'Qtde' },
          { boundingBox: stubBoundingBox(0.823, 0.35), text: 'Unidade' },
          { boundingBox: stubBoundingBox(0.886, 0.35), text: 'Tratamento' },
          { boundingBox: stubBoundingBox(0.048, 0.4), text: '1' },
          {
            boundingBox: stubBoundingBox(0.098, 0.4),
            text: '190812-Lodos de tratamento biológico de efluentes industriais não',
          },
          { boundingBox: stubBoundingBox(0.474, 0.4), text: 'SEMISSÓLIDO' },
          { boundingBox: stubBoundingBox(0.567, 0.4), text: 'CLASSE' },
          { boundingBox: stubBoundingBox(0.624, 0.4), text: 'CAÇAMBA ABERTA' },
          { boundingBox: stubBoundingBox(0.767, 0.4), text: '13,4700' },
          { boundingBox: stubBoundingBox(0.823, 0.4), text: 'TON' },
          { boundingBox: stubBoundingBox(0.886, 0.4), text: 'Compostagem' },
          {
            boundingBox: stubBoundingBox(0.098, 0.42),
            text: 'abrangidos em 08 11 (*)',
          },
          { boundingBox: stubBoundingBox(0.567, 0.42), text: 'IIA' },
        ]),
      );

      expect(result.data.wasteTypes?.parsed).toEqual([
        {
          classification: 'CLASSE IIA',
          code: '190812',
          description:
            'Lodos de tratamento biológico de efluentes industriais não abrangidos em 08 11 (*)',
          quantity: 13.47,
          unit: 'TON',
        },
      ]);
    });

    it('should extract multiple waste rows', () => {
      const rawText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          { boundingBox: stubBoundingBox(0.048, 0.35), text: 'Item' },
          {
            boundingBox: stubBoundingBox(0.098, 0.35),
            text: 'Código IBAMA e Denominação',
          },
          { boundingBox: stubBoundingBox(0.474, 0.35), text: 'Estado Físico' },
          { boundingBox: stubBoundingBox(0.567, 0.35), text: 'Classe' },
          {
            boundingBox: stubBoundingBox(0.624, 0.35),
            text: 'Acondicionamento',
          },
          { boundingBox: stubBoundingBox(0.767, 0.35), text: 'Qtde' },
          { boundingBox: stubBoundingBox(0.823, 0.35), text: 'Unidade' },
          { boundingBox: stubBoundingBox(0.886, 0.35), text: 'Tratamento' },
          { boundingBox: stubBoundingBox(0.048, 0.4), text: '1' },
          {
            boundingBox: stubBoundingBox(0.098, 0.4),
            text: '190812-Lodos de tratamento',
          },
          { boundingBox: stubBoundingBox(0.567, 0.4), text: 'CLASSE IIA' },
          { boundingBox: stubBoundingBox(0.767, 0.4), text: '13,4700' },
          { boundingBox: stubBoundingBox(0.823, 0.4), text: 'TON' },
          { boundingBox: stubBoundingBox(0.048, 0.45), text: '2' },
          {
            boundingBox: stubBoundingBox(0.098, 0.45),
            text: '020101-Lodos de lavagem',
          },
          { boundingBox: stubBoundingBox(0.767, 0.45), text: '5,0000' },
          { boundingBox: stubBoundingBox(0.823, 0.45), text: 'KG' },
        ]),
      );

      expect(result.data.wasteTypes?.parsed).toEqual([
        {
          classification: 'CLASSE IIA',
          code: '190812',
          description: 'Lodos de tratamento',
          quantity: 13.47,
          unit: 'TON',
        },
        {
          code: '020101',
          description: 'Lodos de lavagem',
          quantity: 5,
          unit: 'KG',
        },
      ]);
    });

    it('should dynamically detect column positions from header blocks', () => {
      const rawText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
      ].join('\n');

      // Use non-standard X positions to prove dynamic detection works
      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          // Header row
          { boundingBox: stubBoundingBox(0.03, 0.2), text: 'Item' },
          {
            boundingBox: stubBoundingBox(0.08, 0.2),
            text: 'Código IBAMA e Denominação',
          },
          { boundingBox: stubBoundingBox(0.4, 0.2), text: 'Estado Físico' },
          { boundingBox: stubBoundingBox(0.52, 0.2), text: 'Classe' },
          { boundingBox: stubBoundingBox(0.6, 0.2), text: 'Acondicionamento' },
          { boundingBox: stubBoundingBox(0.72, 0.2), text: 'Qtde' },
          { boundingBox: stubBoundingBox(0.8, 0.2), text: 'Unidade' },
          { boundingBox: stubBoundingBox(0.88, 0.2), text: 'Tratamento' },
          // Data row with matching shifted X positions
          { boundingBox: stubBoundingBox(0.03, 0.3), text: '1' },
          {
            boundingBox: stubBoundingBox(0.08, 0.3),
            text: '190812-Lodos de tratamento',
          },
          { boundingBox: stubBoundingBox(0.52, 0.3), text: 'CLASSE IIA' },
          { boundingBox: stubBoundingBox(0.72, 0.3), text: '7,5000' },
          { boundingBox: stubBoundingBox(0.8, 0.3), text: 'KG' },
        ]),
      );

      expect(result.data.wasteTypes?.parsed).toEqual([
        {
          classification: 'CLASSE IIA',
          code: '190812',
          description: 'Lodos de tratamento',
          quantity: 7.5,
          unit: 'KG',
        },
      ]);
    });

    it('should not extract waste fields when table has no data rows', () => {
      const rawText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          { boundingBox: stubBoundingBox(0.048, 0.35), text: 'Item' },
          {
            boundingBox: stubBoundingBox(0.098, 0.35),
            text: 'Código IBAMA e Denominação',
          },
          { boundingBox: stubBoundingBox(0.474, 0.35), text: 'Estado Físico' },
          { boundingBox: stubBoundingBox(0.567, 0.35), text: 'Classe' },
          {
            boundingBox: stubBoundingBox(0.624, 0.35),
            text: 'Acondicionamento',
          },
          { boundingBox: stubBoundingBox(0.767, 0.35), text: 'Qtde' },
          { boundingBox: stubBoundingBox(0.823, 0.35), text: 'Unidade' },
          { boundingBox: stubBoundingBox(0.886, 0.35), text: 'Tratamento' },
        ]),
      );

      expect(result.data.wasteTypes).toBeUndefined();
    });

    it('should not extract waste fields when headers are not detected', () => {
      const rawText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          { boundingBox: stubBoundingBox(0.9, 0.1), text: 'Random text' },
        ]),
      );

      expect(result.data.wasteTypes).toBeUndefined();
    });

    it('should handle description without waste code pattern', () => {
      const rawText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          { boundingBox: stubBoundingBox(0.048, 0.35), text: 'Item' },
          {
            boundingBox: stubBoundingBox(0.098, 0.35),
            text: 'Código IBAMA e Denominação',
          },
          { boundingBox: stubBoundingBox(0.474, 0.35), text: 'Estado Físico' },
          { boundingBox: stubBoundingBox(0.567, 0.35), text: 'Classe' },
          {
            boundingBox: stubBoundingBox(0.624, 0.35),
            text: 'Acondicionamento',
          },
          { boundingBox: stubBoundingBox(0.767, 0.35), text: 'Qtde' },
          { boundingBox: stubBoundingBox(0.823, 0.35), text: 'Unidade' },
          { boundingBox: stubBoundingBox(0.886, 0.35), text: 'Tratamento' },
          { boundingBox: stubBoundingBox(0.048, 0.4), text: '1' },
          {
            boundingBox: stubBoundingBox(0.098, 0.4),
            text: 'Resíduo genérico sem código',
          },
          { boundingBox: stubBoundingBox(0.767, 0.4), text: '10,0000' },
          { boundingBox: stubBoundingBox(0.823, 0.4), text: 'TON' },
        ]),
      );

      expect(result.data.wasteTypes?.parsed).toEqual([
        {
          description: 'Resíduo genérico sem código',
          quantity: 10,
          unit: 'TON',
        },
      ]);
    });

    it('should skip rows without description column', () => {
      const rawText = [
        'MTR n° 123456',
        'Data da emissão: 01/01/2024',
        'CETESB',
      ].join('\n');

      const result = parser.parse(
        stubTextExtractionResultWithBlocks(rawText, [
          { boundingBox: stubBoundingBox(0.048, 0.35), text: 'Item' },
          {
            boundingBox: stubBoundingBox(0.098, 0.35),
            text: 'Código IBAMA e Denominação',
          },
          { boundingBox: stubBoundingBox(0.474, 0.35), text: 'Estado Físico' },
          { boundingBox: stubBoundingBox(0.567, 0.35), text: 'Classe' },
          {
            boundingBox: stubBoundingBox(0.624, 0.35),
            text: 'Acondicionamento',
          },
          { boundingBox: stubBoundingBox(0.767, 0.35), text: 'Qtde' },
          { boundingBox: stubBoundingBox(0.823, 0.35), text: 'Unidade' },
          { boundingBox: stubBoundingBox(0.886, 0.35), text: 'Tratamento' },
          { boundingBox: stubBoundingBox(0.048, 0.4), text: '1' },
          { boundingBox: stubBoundingBox(0.767, 0.4), text: '10,0000' },
          { boundingBox: stubBoundingBox(0.048, 0.45), text: '2' },
          {
            boundingBox: stubBoundingBox(0.098, 0.45),
            text: '190812-Lodos de tratamento',
          },
        ]),
      );

      expect(result.data.wasteTypes?.parsed).toEqual([
        { code: '190812', description: 'Lodos de tratamento' },
      ]);
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
      expect(parser.layoutId).toBe('mtr-sigor');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
