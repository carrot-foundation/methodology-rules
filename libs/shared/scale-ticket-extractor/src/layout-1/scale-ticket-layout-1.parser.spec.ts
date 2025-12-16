import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { Layout1ScaleTicketParser } from './scale-ticket-layout-1.parser';

const buildExtractionResult = (rawText: string): TextExtractionResult => ({
  blocks: [],
  rawText,
});

describe('Layout1ScaleTicketParser', () => {
  const parser = new Layout1ScaleTicketParser();

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

  it('should parse a valid extraction result', () => {
    const result = parser.parse(buildExtractionResult(validRawText));

    expect(result.netWeight).toEqual({ unit: 'kg', value: 200.25 });
    expect(result.ticketNumber).toBe('12345');
    expect(result.vehiclePlate).toBe('ABC1234');
    expect(result.transporter).toEqual({
      code: '987',
      name: 'TRANSPORTES TESTE LTDA',
    });
    expect(result.initialWeight?.value).toBeCloseTo(1000.5);
    expect(result.finalWeight?.value).toBeCloseTo(800.25);
    expect(result.rawText).toContain('Ticket de pesagem');
  });

  it('should throw when net weight cannot be extracted', () => {
    const noNetWeightText = `
      Ticket de pesagem   12345
      Placa Veículo ABC1234
      Transportadora: 987 - TRANSPORTES TESTE LTDA
    `;

    expect(() => parser.parse(buildExtractionResult(noNetWeightText))).toThrow(
      'Net weight is required but could not be extracted',
    );
  });
});
