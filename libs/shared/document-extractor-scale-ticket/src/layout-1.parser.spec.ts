import { clearRegistry } from '@carrot-fndn/shared/document-extractor';
import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { ScaleTicketLayout1Parser } from './layout-1.parser';

describe('ScaleTicketLayout1Parser', () => {
  const parser = new ScaleTicketLayout1Parser();

  beforeEach(() => {
    clearRegistry();
  });

  const validRawText = `
    Ticket de pesagem   12345
    Placa Veículo ABC1234
    Transportadora: 987 - TRANSPORTES TESTE LTDA
    Pesagem Inicial: 1.000,50 kg
    Data / Hora: 01/02/2023 03:04
    Pesagem Final: 800,25 kg
    Data / Hora: 01/02/2023 04:05
    Peso Líquido: 200,25 kg
  `;

  describe('parse', () => {
    it('should parse a valid extraction result with high confidence', () => {
      const result = parser.parse(stubTextExtractionResult(validRawText));

      expect(result.data.netWeight.parsed).toEqual({
        unit: 'kg',
        value: 200.25,
      });
      expect(result.data.netWeight.confidence).toBe('high');
      expect(result.data.ticketNumber?.parsed).toBe('12345');
      expect(result.data.vehiclePlate?.parsed).toBe('ABC1234');
      expect(result.data.transporter?.parsed).toEqual({
        code: '987',
        name: 'TRANSPORTES TESTE LTDA',
      });
      expect(result.data.initialWeight?.parsed.value).toBeCloseTo(1000.5);
      expect(result.data.finalWeight?.parsed.value).toBeCloseTo(800.25);
      expect(result.data.rawText).toContain('Ticket de pesagem');
      expect(result.data.documentType).toBe('scaleTicket');
      expect(result.reviewRequired).toBe(false);
    });

    it('should set reviewRequired when net weight is missing', () => {
      const noNetWeightText = `
        Ticket de pesagem   12345
        Placa Veículo ABC1234
        Transportadora: 987 - TRANSPORTES TESTE LTDA
      `;

      const result = parser.parse(stubTextExtractionResult(noNetWeightText));

      expect(result.data.netWeight).toBeUndefined();
      expect(result.data.missingRequiredFields).toContain('netWeight');
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toContainEqual(
        expect.stringContaining('Missing required fields'),
      );
    });

    it('should parse with accented characters in pattern', () => {
      const accentedText = `
        Ticket de pesagem   99999
        Placa Veiculo XYZ9999
        Peso Liquido: 150,00 kg
      `;

      const result = parser.parse(stubTextExtractionResult(accentedText));

      expect(result.data.netWeight.parsed).toEqual({ unit: 'kg', value: 150 });
      expect(result.data.ticketNumber?.parsed).toBe('99999');
      expect(result.data.vehiclePlate?.parsed).toBe('XYZ9999');
    });

    it('should track extraction confidence', () => {
      const result = parser.parse(stubTextExtractionResult(validRawText));

      expect(result.data.extractionConfidence).toBe('high');
      expect(result.data.lowConfidenceFields).toEqual([]);
    });

    it('should handle invalid net weight number format', () => {
      const invalidWeightText = `
        Ticket de pesagem   12345
        Peso Líquido: invalid kg
      `;

      const result = parser.parse(stubTextExtractionResult(invalidWeightText));

      expect(result.data.netWeight).toBeUndefined();
      expect(result.data.missingRequiredFields).toContain('netWeight');
    });

    it('should handle weight without datetime information', () => {
      const noDateTimeText = `
        Ticket de pesagem   12345
        Pesagem Inicial: 500,00 kg
        Pesagem Final: 400,00 kg
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(stubTextExtractionResult(noDateTimeText));

      expect(result.data.initialWeight?.parsed.value).toBe(500);
      expect(result.data.initialWeight?.parsed.timestamp).toBeUndefined();
      expect(result.data.finalWeight?.parsed.value).toBe(400);
    });

    it('should handle invalid weight number in initial/final weight', () => {
      const invalidNumberText = `
        Ticket de pesagem   12345
        Pesagem Inicial: abc kg
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(stubTextExtractionResult(invalidNumberText));

      expect(result.data.initialWeight).toBeUndefined();
      expect(result.data.netWeight.parsed.value).toBe(100);
    });

    it('should handle transporter with newline in name', () => {
      const newlineNameText = `
        Ticket de pesagem   12345
        Transportadora: 987 - NOME
        Segunda Linha
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(stubTextExtractionResult(newlineNameText));

      // The parser takes only the first line of the name
      expect(result.data.transporter?.parsed.name).toBe('NOME');
    });

    it('should handle malformed datetime pattern', () => {
      const malformedDateText = `
        Ticket de pesagem   12345
        Pesagem Inicial: 500,00 kg
        Data / Hora: invalid-date
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(stubTextExtractionResult(malformedDateText));

      expect(result.data.initialWeight?.parsed.timestamp).toBeUndefined();
    });

    it('should handle incomplete datetime parts', () => {
      const incompleteDateText = `
        Ticket de pesagem   12345
        Pesagem Inicial: 500,00 kg
        Data / Hora: 01/02/2023
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(stubTextExtractionResult(incompleteDateText));

      expect(result.data.initialWeight?.parsed.timestamp).toBeUndefined();
    });

    it('should handle transporter extraction when name results in empty after trim', () => {
      // When transporter pattern matches but produces empty name after split
      const transporterEmptyNameText = `
        Ticket de pesagem   12345
        Transportadora: 987 -
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(
        stubTextExtractionResult(transporterEmptyNameText),
      );

      // Due to regex, name won't be exactly empty but will be captured
      expect(result.data.transporter).toBeDefined();
    });

    it('should handle net weight with non-numeric value after pattern match', () => {
      // Net weight pattern matches with dots that parse to NaN
      const netWeightInvalidValueText = `
        Ticket de pesagem   12345
        Peso Líquido: ... kg
      `;

      const result = parser.parse(
        stubTextExtractionResult(netWeightInvalidValueText),
      );

      expect(result.data.netWeight).toBeUndefined();
    });

    it('should handle initial weight with completely invalid number', () => {
      // Initial weight pattern matches but number parse fails completely
      const invalidInitialWeightText = `
        Ticket de pesagem   12345
        Pesagem Inicial: --- kg
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(
        stubTextExtractionResult(invalidInitialWeightText),
      );

      expect(result.data.initialWeight).toBeUndefined();
    });

    it('should handle transporter with empty name after trim', () => {
      // Transporter pattern matches but name is only whitespace (no Peso after to stop the lazy match)
      const emptyNameText = `Ticket de pesagem   12345
Transportadora: 987 -   `;

      const result = parser.parse(stubTextExtractionResult(emptyNameText));

      expect(result.data.transporter).toBeUndefined();
    });

    it('should handle initial weight with invalid number that parses to NaN', () => {
      // Pattern matches dots/commas but they parse to NaN
      const invalidInitialWeightNaNText = `
        Ticket de pesagem   12345
        Pesagem Inicial: ... kg
        Data / Hora: 01/02/2023 10:30
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(
        stubTextExtractionResult(invalidInitialWeightNaNText),
      );

      expect(result.data.initialWeight).toBeUndefined();
    });

    it('should handle date with missing time component', () => {
      // Date exists but time is incomplete
      const missingTimeText = `
        Ticket de pesagem   12345
        Pesagem Inicial: 500,00 kg
        Data / Hora: 01/02/2023
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(stubTextExtractionResult(missingTimeText));

      expect(result.data.initialWeight?.parsed.timestamp).toBeUndefined();
    });

    it('should handle date with incomplete date parts', () => {
      // Date pattern matches but parts are incomplete
      const incompleteDatePartsText = `
        Ticket de pesagem   12345
        Pesagem Inicial: 500,00 kg
        Data / Hora: /02/2023 10:30
        Peso Líquido: 100,00 kg
      `;

      const result = parser.parse(
        stubTextExtractionResult(incompleteDatePartsText),
      );

      expect(result.data.initialWeight?.parsed.timestamp).toBeUndefined();
    });
  });

  describe('getMatchScore', () => {
    it('should return high score for valid scale ticket text', () => {
      const score = parser.getMatchScore(
        stubTextExtractionResult(validRawText),
      );

      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for non-scale-ticket text', () => {
      const irrelevantText = 'This is just random text with no patterns';
      const score = parser.getMatchScore(
        stubTextExtractionResult(irrelevantText),
      );

      expect(score).toBeLessThan(0.3);
    });
  });

  describe('metadata', () => {
    it('should have correct document type and layout id', () => {
      expect(parser.documentType).toBe('scaleTicket');
      expect(parser.layoutId).toBe('layout-1');
      expect(parser.textractMode).toBe('detect');
    });
  });
});
