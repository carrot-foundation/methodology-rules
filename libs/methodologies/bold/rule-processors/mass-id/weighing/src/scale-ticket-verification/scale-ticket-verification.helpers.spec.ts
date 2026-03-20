import type { MethodologyAdditionalVerification } from '@carrot-fndn/shared/types';

import { ScaleTicketLayout1Parser } from '@carrot-fndn/shared/document-extractor-scale-ticket';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

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
      } as MethodologyAdditionalVerification,
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
      } as MethodologyAdditionalVerification,
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when expected net weight is zero and matches the ticket net weight', async () => {
    const baseConfig: MethodologyAdditionalVerification = {
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
    expect(result.errors[0]).toContain('is not supported');
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
    expect(result.errors[0]).toContain('does not match the "Event Value"');
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
    expect(result.errors[0]).toContain('could not be processed');
  });

  it('should build a scale ticket verification context', () => {
    const config: MethodologyAdditionalVerification = {
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
    expect(result.errors[0]).toContain('could not be processed');
  });
});
