import { stubTextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { ScaleTicketPesagemManualParser } from './pesagem-manual.parser';
import {
  stubLayout1TicketText,
  stubPesagemManualText,
  stubToledoGuardianText,
} from './scale-ticket.stubs';

describe('ScaleTicketPesagemManualParser', () => {
  const parser = new ScaleTicketPesagemManualParser();

  const parse = (weights: Parameters<typeof stubPesagemManualText>[0]) =>
    parser.parse(stubTextExtractionResult(stubPesagemManualText(weights)));

  describe('getMatchScore', () => {
    it('should fully match the manual weighing form', () => {
      expect(
        parser.getMatchScore(
          stubTextExtractionResult(
            stubPesagemManualText({ gross: '1', net: '1', tare: '0' }),
          ),
        ),
      ).toBe(1);
    });

    it.each([
      { description: 'a layout-1 ticket', text: stubLayout1TicketText() },
      {
        description: 'a Toledo Guardian ticket',
        text: stubToledoGuardianText({ net: '100 kg' }),
      },
    ])('should not match $description', ({ text }) => {
      expect(parser.getMatchScore(stubTextExtractionResult(text))).toBe(0);
    });
  });

  describe('parse', () => {
    it.each([
      {
        description: 'thousands separators in kg',
        expected: { gross: 15_340, net: 5120, tare: 10_220 },
        weights: { gross: '15,340', net: '5.120', tare: '10.220' },
      },
      {
        description: 'plain kg integers',
        expected: { gross: 9150, net: 760, tare: 8390 },
        weights: { gross: '9150', net: '760', tare: '8390' },
      },
      {
        description: 'a net weight written in tonnes',
        expected: { gross: 13_450, net: 2470, tare: 10_980 },
        weights: { gross: '13.450', net: '2,47', tare: '10.980' },
      },
      {
        description: 'a tonne net with a leading zero and a dash separator',
        expected: { gross: 12_360, net: 750, tare: 11_610 },
        weights: { gross: '12.360', net: '0,750', tare: '11-610' },
      },
      {
        description: 'every weight written in whole tonnes',
        expected: { gross: 12_000, net: 2000, tare: 10_000 },
        weights: { gross: '12', net: '2', tare: '10' },
      },
      {
        description: 'a gross weight written in tonnes',
        expected: { gross: 12_000, net: 1500, tare: 10_500 },
        weights: { gross: '12', net: '1500', tare: '10500' },
      },
    ])(
      'should reconcile A - B = net with $description',
      ({ expected, weights }) => {
        const result = parse(weights);

        expect(result.data.netWeight).toEqual({
          confidence: 'high',
          parsed: { unit: 'kg', value: expected.net },
          rawMatch: weights.net,
        });
        expect(result.data.initialWeight?.parsed.value).toBe(expected.gross);
        expect(result.data.finalWeight?.parsed.value).toBe(expected.tare);
        expect(result.data.extractionConfidence).toBe('high');
        expect(result.reviewRequired).toBe(false);
      },
    );

    it('should flag all weights as low confidence when A - B does not equal the net weight', () => {
      const result = parse({ gross: '12.000', net: '3.000', tare: '10.000' });

      expect(result.data.netWeight).toMatchObject({
        confidence: 'low',
        parsed: { value: 3000 },
      });
      expect(result.data.lowConfidenceFields).toEqual([
        'netWeight',
        'initialWeight',
        'finalWeight',
      ]);
      expect(result.reviewRequired).toBe(true);
    });

    it('should fall back to the kg reading with low confidence when no reading reconciles', () => {
      const result = parse({ gross: '12', net: '3000', tare: '10000' });

      expect(result.data.initialWeight).toMatchObject({
        confidence: 'low',
        parsed: { value: 12 },
      });
    });

    it('should not read a value past the end of the weights section', () => {
      const result = parser.parse(
        stubTextExtractionResult(
          'PESAGEM MANUAL\nTara (B)\nMotivo da pesagem em manual:\n5000',
        ),
      );

      expect(result.data.finalWeight).toBeUndefined();
    });

    it('should keep a low-confidence net weight when the tare cannot be read', () => {
      const result = parse({ gross: '12.000', net: '2.000' });

      expect(result.data.netWeight).toMatchObject({
        confidence: 'low',
        parsed: { value: 2000 },
      });
      expect(result.data.finalWeight).toBeUndefined();
    });

    it('should not read a weight from the next label section', () => {
      const result = parse({ net: '2.000', tare: '10.000' });

      expect(result.data.initialWeight).toBeUndefined();
      expect(result.data.netWeight?.confidence).toBe('low');
    });

    it('should skip a value with more than three decimal digits', () => {
      const result = parse({ gross: '12.000', net: '2,0000', tare: '10.000' });

      expect(result.data.netWeight).toBeUndefined();
    });

    it('should return no weights when the form labels are missing', () => {
      const result = parser.parse(
        stubTextExtractionResult(stubLayout1TicketText()),
      );

      expect(result.data.netWeight).toBeUndefined();
      expect(result.data.initialWeight).toBeUndefined();
      expect(result.data.finalWeight).toBeUndefined();
    });

    it('should ignore a weight label with no value before the form ends', () => {
      const result = parser.parse(
        stubTextExtractionResult('PESAGEM MANUAL\nPeso Liquido (A-B)'),
      );

      expect(result.data.netWeight).toBeUndefined();
    });
  });

  it('should expose its layout metadata', () => {
    expect(parser.documentType).toBe('scaleTicket');
    expect(parser.layoutId).toBe('pesagem-manual');
    expect(parser.textractMode).toBe('detect');
  });
});
