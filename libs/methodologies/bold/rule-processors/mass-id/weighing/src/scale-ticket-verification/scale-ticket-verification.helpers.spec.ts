import type { AdditionalVerification } from '@carrot-fndn/shared/types';

import { ScaleTicketLayout1Parser } from '@carrot-fndn/shared/document-extractor-scale-ticket';
import {
  stubTextExtractionResult,
  textExtractor,
} from '@carrot-fndn/shared/text-extractor';

import {
  buildScaleTicketVerificationContext,
  verifyScaleTicketNetWeight,
} from './scale-ticket-verification.helpers';

describe('scale-ticket-verification', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should pass when extracted net weight matches the event value', async () => {
    const textExtractorInput = { filePath: 'dummy-path' };
    const expectedNetWeight = 200.25;

    vi.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    vi.spyOn(ScaleTicketLayout1Parser.prototype, 'parse').mockReturnValue({
      data: {
        documentType: 'scaleTicket',
        extractionConfidence: 'high',
        lowConfidenceFields: [],
        netWeight: {
          confidence: 'high',
          parsed: { unit: 'kg', value: expectedNetWeight },
        },
        rawText: '',
      },
      reviewReasons: [],
      reviewRequired: false,
    } as never);

    const result = await verifyScaleTicketNetWeight({
      config: {
        'Layout IDs': ['layout-1'],
        'Verification Type': 'Scale Ticket',
      },
      expectedNetWeight,
      textExtractorInput,
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when config verificationType is not scaleTicket', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: {
        'Verification Type': 'otherType',
      } as AdditionalVerification,
      expectedNetWeight: 100,
      textExtractorInput: undefined,
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when verificationType is not scaleTicket', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: {
        'Layout IDs': ['layout-1'],
        'Verification Type': 'otherType',
      } as AdditionalVerification,
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when expected net weight is zero and matches the ticket net weight', async () => {
    const baseConfig: AdditionalVerification = {
      'Layout IDs': ['layout-1'],
      'Verification Type': 'Scale Ticket',
    };

    vi.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    vi.spyOn(ScaleTicketLayout1Parser.prototype, 'parse').mockReturnValue({
      data: {
        documentType: 'scaleTicket',
        extractionConfidence: 'high',
        lowConfidenceFields: [],
        netWeight: { confidence: 'high', parsed: { unit: 'kg', value: 0 } },
        rawText: '',
      },
      reviewReasons: [],
      reviewRequired: false,
    } as never);

    const zeroResult = await verifyScaleTicketNetWeight({
      config: baseConfig,
      expectedNetWeight: 0,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(zeroResult.errors).toHaveLength(0);
  });

  it('should return an error when textract input is missing but config is provided', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: {
        'Layout IDs': ['layout-1'],
        'Verification Type': 'Scale Ticket',
      },
      expectedNetWeight: 100,
      textExtractorInput: undefined,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.finding).toEqual({
      code: 'weighing.INVALID.SCALE_TICKET_MISSING_SOURCE',
      defaultOwner: 'INTEGRATOR',
    });
  });

  it('should return an error when layoutIds is missing or empty', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: {
        'Verification Type': 'Scale Ticket',
      } as unknown as {
        'Layout IDs': ['layout-1'];
        'Verification Type': 'Scale Ticket';
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('is not supported');
    expect(result.errors[0]?.finding).toEqual({
      code: 'weighing.INVALID.SCALE_TICKET_UNSUPPORTED_LAYOUT',
      defaultOwner: 'CARROT',
    });
  });

  it('should return a mismatch error when ticket net weight differs from event value', async () => {
    vi.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    vi.spyOn(ScaleTicketLayout1Parser.prototype, 'parse').mockReturnValue({
      data: {
        documentType: 'scaleTicket',
        extractionConfidence: 'high',
        lowConfidenceFields: [],
        netWeight: { confidence: 'high', parsed: { unit: 'kg', value: 50 } },
        rawText: '',
      },
      reviewReasons: [],
      reviewRequired: false,
    } as never);

    const result = await verifyScaleTicketNetWeight({
      config: {
        'Layout IDs': ['layout-1'],
        'Verification Type': 'Scale Ticket',
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain(
      'does not match the "Event Value"',
    );
    expect(result.errors[0]?.finding).toEqual({
      code: 'weighing.INVALID.SCALE_TICKET_NET_WEIGHT_MISMATCH',
      defaultOwner: 'INTEGRATOR',
    });
  });

  describe('with the layout-1 parser reading the extracted text', () => {
    const scaleTicketConfig: AdditionalVerification = {
      'Layout IDs': ['layout-1'],
      'Verification Type': 'Scale Ticket',
    };

    const legibleLayout1Text = `
      Ticket de pesagem   12345
      Placa Veículo ABC1234
      Pesagem Inicial: 1.000,50 kg
      Pesagem Final: 800,25 kg
      Peso Líquido: 200,25 kg
    `;

    it.each([
      { errorCodes: [], expectedNetWeight: 200.25 },
      {
        errorCodes: ['weighing.INVALID.SCALE_TICKET_NET_WEIGHT_MISMATCH'],
        expectedNetWeight: 150,
      },
    ])(
      'should compare the net weight of a legible ticket against $expectedNetWeight',
      async ({ errorCodes, expectedNetWeight }) => {
        vi.spyOn(textExtractor, 'extractText').mockResolvedValue(
          stubTextExtractionResult(legibleLayout1Text),
        );

        const result = await verifyScaleTicketNetWeight({
          config: scaleTicketConfig,
          expectedNetWeight,
          textExtractorInput: { filePath: 'dummy-path' },
        });

        expect(result.errors.map((error) => error.finding.code)).toEqual(
          errorCodes,
        );
      },
    );

    it('should return a layout not recognized error when no net weight can be read', async () => {
      vi.spyOn(textExtractor, 'extractText').mockResolvedValue(
        stubTextExtractionResult(`
          Controle de entrada
          Material: residuo organico
          Quantidade: 3 cacambas
        `),
      );

      const result = await verifyScaleTicketNetWeight({
        config: scaleTicketConfig,
        expectedNetWeight: 100,
        textExtractorInput: { filePath: 'dummy-path' },
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain(
        'does not match a supported layout',
      );
      expect(result.errors[0]?.finding).toEqual({
        code: 'weighing.INVALID.SCALE_TICKET_LAYOUT_NOT_RECOGNIZED',
        defaultOwner: 'INTEGRATOR',
      });
    });
  });

  it('should return an extraction failed error when text extractor throws', async () => {
    vi.spyOn(textExtractor, 'extractText').mockRejectedValue(new Error('boom'));

    const result = await verifyScaleTicketNetWeight({
      config: {
        'Layout IDs': ['layout-1'],
        'Verification Type': 'Scale Ticket',
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('could not be processed');
    expect(result.errors[0]?.finding).toEqual({
      code: 'weighing.INVALID.SCALE_TICKET_EXTRACTION_FAILED',
      defaultOwner: 'CARROT',
    });
  });

  it('should build a scale ticket verification context', () => {
    const config: AdditionalVerification = {
      'Layout IDs': ['layout-1'],
      'Verification Type': 'Scale Ticket',
    };

    const context = buildScaleTicketVerificationContext({
      config,
      expectedNetWeight: 123,
    });

    expect(context).toEqual({
      config,
      expectedNetWeight: 123,
    });
  });

  it('should build an unsupported layout error message', async () => {
    vi.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    const result = await verifyScaleTicketNetWeight({
      config: {
        'Layout IDs': ['layout-unsupported'],
        'Verification Type': 'Scale Ticket',
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('could not be processed');
    expect(result.errors[0]?.finding).toEqual({
      code: 'weighing.INVALID.SCALE_TICKET_EXTRACTION_FAILED',
      defaultOwner: 'CARROT',
    });
  });
});
