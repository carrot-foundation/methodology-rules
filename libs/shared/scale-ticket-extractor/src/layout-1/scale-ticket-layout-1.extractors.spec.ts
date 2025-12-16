import {
  extractFinalWeight,
  extractInitialWeight,
  extractNetWeight,
  extractTicketNumber,
  extractTimestamp,
  extractTransporter,
  extractVehiclePlate,
  extractWeightWithTimestamp,
} from './scale-ticket-layout-1.extractors';

describe('layout-1 extractors', () => {
  const baseText = `
    Ticket de pesagem   12345
    Placa Veículo ABC1234
    Transportadora: 987 - TRANSPORTES TESTE LTDA
    Pesagem Inicial: 1.000,50 kg
    Data / Hora: 01/02/2023 03:04
    Pesagem Final: 800,25 kg
    Data / Hora: 01/02/2023 04:05
    Peso Líquido: 200,25 kg
  `;

  it('should extract ticket number', () => {
    expect(extractTicketNumber(baseText)).toBe('12345');
  });

  it('should extract vehicle plate', () => {
    expect(extractVehiclePlate(baseText)).toBe('ABC1234');
  });

  it('should extract transporter info', () => {
    const result = extractTransporter(baseText);

    expect(result).toEqual({
      code: '987',
      name: 'TRANSPORTES TESTE LTDA',
    });
  });

  it('should extract net weight', () => {
    const result = extractNetWeight(baseText);

    expect(result).toEqual({
      unit: 'kg',
      value: 200.25,
    });
  });

  it('should extract initial weight with timestamp', () => {
    const result = extractInitialWeight(baseText);

    expect(result).toBeDefined();
    expect(result?.value).toBeCloseTo(1000.5);
    expect(result?.unit).toBe('kg');
    expect(result?.timestamp).toBeInstanceOf(Date);
  });

  it('should extract final weight with timestamp', () => {
    const result = extractFinalWeight(baseText);

    expect(result).toBeDefined();
    expect(result?.value).toBeCloseTo(800.25);
    expect(result?.unit).toBe('kg');
    expect(result?.timestamp).toBeInstanceOf(Date);
  });

  it('should return undefined when transporter cannot be extracted', () => {
    const result = extractTransporter('no transporter here');

    expect(result).toBeUndefined();
  });

  it('should return undefined when net weight pattern is missing', () => {
    expect(extractNetWeight('Peso Líquido ausente')).toBeUndefined();
  });

  it('should return undefined when net weight value parses to NaN', () => {
    // "." matches [\d.,]+ but parseFloat("") after replace is NaN
    expect(extractNetWeight('Peso Líquido: . kg')).toBeUndefined();
  });

  it('should return undefined when timestamp anchor is not found', () => {
    const result = extractTimestamp(
      'no matching anchor',
      /Peso L[ií]quido/,
      /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
    );

    expect(result).toBeUndefined();
  });

  it('should return weight without timestamp when date/time cannot be extracted', () => {
    const text = `
      Pesagem Inicial: 1.000,50 kg
      some line without date time pattern
    `;

    const result = extractWeightWithTimestamp(
      text,
      /Pesagem Inicial:\s*([\d.,]+)\s*(kg)/i,
      /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
    );

    expect(result).toEqual({
      unit: 'kg',
      value: 1000.5,
    });
  });

  it('should return undefined when weight pattern is missing', () => {
    const result = extractWeightWithTimestamp(
      'no weight here',
      /Pesagem Inicial:\s*([\d.,]+)\s*(kg)/i,
      /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
    );

    expect(result).toBeUndefined();
  });

  it('should return undefined when weight value parses to NaN', () => {
    // "." matches [\d.,]+ but parseFloat("") after replace is NaN
    const result = extractWeightWithTimestamp(
      'Pesagem Inicial: . kg',
      /Pesagem Inicial:\s*([\d.,]+)\s*(kg)/i,
      /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
    );

    expect(result).toBeUndefined();
  });

  it('should return undefined when timestamp cannot be parsed after anchor', () => {
    const text = `
      Pesagem Final: 500,00 kg
      Data / Hora: 01/02/2023 aa:bb
    `;

    const result = extractTimestamp(
      text,
      /Pesagem Final:\s*([\d.,]+)\s*(kg)/i,
      /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
    );

    expect(result).toBeUndefined();
  });

  it('should return undefined string field when pattern does not match', () => {
    expect(extractTicketNumber('no ticket here')).toBeUndefined();
  });

  it('should return undefined when transporter name is only whitespace', () => {
    // Pattern captures "\n" which trims to empty string
    const result = extractTransporter('Transportadora: 123 - \n');

    expect(result).toBeUndefined();
  });

  it('should return undefined when unit is not captured in weight pattern', () => {
    // Pattern without unit capture group
    const result = extractWeightWithTimestamp(
      'Pesagem Inicial: 500,00',
      /Pesagem Inicial:\s*([\d.,]+)/i,
      /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
    );

    expect(result).toBeUndefined();
  });
});
