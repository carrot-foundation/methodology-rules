import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import {
  stubLayout1TicketText,
  stubPesagemManualText,
  stubToledoGuardianText,
} from './scale-ticket.stubs';
import { ScaleTicketToledoGuardianParser } from './toledo-guardian.parser';

describe('ScaleTicketToledoGuardianParser', () => {
  const parser = new ScaleTicketToledoGuardianParser();

  const parse = (weights: Parameters<typeof stubToledoGuardianText>[0]) =>
    parser.parse(stubTextExtractionResult(stubToledoGuardianText(weights)));

  describe('getMatchScore', () => {
    it('should fully match the Toledo Guardian ticket', () => {
      expect(
        parser.getMatchScore(
          stubTextExtractionResult(stubToledoGuardianText({})),
        ),
      ).toBe(1);
    });

    it.each([
      { description: 'a layout-1 ticket', text: stubLayout1TicketText() },
      {
        description: 'a manual weighing form',
        text: stubPesagemManualText({ gross: '1', net: '1', tare: '0' }),
      },
    ])('should not match $description', ({ text }) => {
      expect(parser.getMatchScore(stubTextExtractionResult(text))).toBe(0);
    });
  });

  describe('parse', () => {
    it.each([
      { first: '9500 kg', second: '10.000 kg' },
      { first: '10.000 kg', second: '9500 kg' },
    ])(
      'should read a high-confidence net weight when |$second - $first| matches the net table',
      ({ first, second }) => {
        const result = parse({
          firstWeighing: first,
          net: '500 kg',
          secondWeighing: second,
        });

        expect(result.data.netWeight).toEqual({
          confidence: 'high',
          parsed: { unit: 'kg', value: 500 },
          rawMatch: '500 kg',
        });
        expect(result.reviewRequired).toBe(false);
      },
    );

    it('should keep the net table value with low confidence when the weighings disagree', () => {
      const result = parse({
        firstWeighing: '9500 kg',
        net: '200 kg',
        secondWeighing: '10.000 kg',
      });

      expect(result.data.netWeight).toMatchObject({
        confidence: 'low',
        parsed: { value: 200 },
      });
      expect(result.data.lowConfidenceFields).toEqual(['netWeight']);
    });

    it('should fall back to the weighings difference with low confidence when the net table is empty', () => {
      const result = parse({
        firstWeighing: '9500 kg',
        secondWeighing: '10.000 kg',
      });

      expect(result.data.netWeight).toMatchObject({
        confidence: 'low',
        parsed: { value: 500 },
      });
      expect(result.data.netWeight?.rawMatch).toBeUndefined();
    });

    it('should keep the net table value with low confidence when a weighing is missing', () => {
      const result = parse({ firstWeighing: '9500 kg', net: '500 kg' });

      expect(result.data.netWeight).toMatchObject({
        confidence: 'low',
        parsed: { value: 500 },
      });
    });

    it('should return no net weight when neither the table nor the weighings can be read', () => {
      expect(parse({}).data.netWeight).toBeUndefined();
    });

    it('should not read weighings without the weighing header', () => {
      const result = parser.parse(
        stubTextExtractionResult(
          'Peso:\n9500 kg\nPeso:\n10000 kg\nPeso Liquido',
        ),
      );

      expect(result.data.netWeight).toBeUndefined();
    });

    it('should return no net weight when the net table header is missing', () => {
      const result = parser.parse(
        stubTextExtractionResult('Pesagem Inicial\n9500 kg\n10000 kg'),
      );

      expect(result.data.netWeight).toBeUndefined();
    });
  });

  it('should expose its layout metadata', () => {
    expect(parser.documentType).toBe('scaleTicket');
    expect(parser.layoutId).toBe('toledo-guardian');
    expect(parser.textractMode).toBe('detect');
  });
});
