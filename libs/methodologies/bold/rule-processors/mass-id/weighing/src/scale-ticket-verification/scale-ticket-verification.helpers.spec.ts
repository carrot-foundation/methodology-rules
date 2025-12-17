import type { MethodologyAdditionalVerification } from '@carrot-fndn/shared/types';

import { Layout1ScaleTicketParser } from '@carrot-fndn/shared/scale-ticket-extractor';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

import {
  buildScaleTicketVerificationContext,
  verifyScaleTicketNetWeight,
} from './scale-ticket-verification.helpers';

describe('scale-ticket-verification', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should pass when extracted net weight matches the event value', async () => {
    const textExtractorInput = { filePath: 'dummy-path' };
    const expectedNetWeight = 200.25;

    jest.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    jest.spyOn(Layout1ScaleTicketParser.prototype, 'parse').mockReturnValue({
      isValid: true,
      netWeight: { unit: 'kg', value: expectedNetWeight },
      rawText: '',
    } as never);

    const result = await verifyScaleTicketNetWeight({
      config: {
        scaleTicketLayout: 'layout1',
        verificationType: 'scaleTicket',
      },
      expectedNetWeight,
      textExtractorInput,
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when config verificationType is not scaleTicket', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: {
        verificationType: 'otherType',
      } as MethodologyAdditionalVerification,
      expectedNetWeight: 100,
      textExtractorInput: undefined,
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when verificationType is not scaleTicket', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: {
        scaleTicketLayout: 'layout1',
        verificationType: 'otherType',
      } as unknown as {
        scaleTicketLayout: 'layout1';
        verificationType: 'scaleTicket';
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when expected net weight is zero and matches the ticket net weight', async () => {
    const baseConfig = {
      scaleTicketLayout: 'layout1' as const,
      verificationType: 'scaleTicket' as const,
    };

    jest.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    jest.spyOn(Layout1ScaleTicketParser.prototype, 'parse').mockReturnValue({
      isValid: true,
      netWeight: { unit: 'kg', value: 0 },
      rawText: '',
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
        scaleTicketLayout: 'layout1',
        verificationType: 'scaleTicket',
      },
      expectedNetWeight: 100,
      textExtractorInput: undefined,
    });

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should return a mismatch error when ticket net weight differs from event value', async () => {
    jest.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    jest.spyOn(Layout1ScaleTicketParser.prototype, 'parse').mockReturnValue({
      isValid: true,
      netWeight: { unit: 'kg', value: 50 },
      rawText: '',
    } as never);

    const result = await verifyScaleTicketNetWeight({
      config: {
        scaleTicketLayout: 'layout1',
        verificationType: 'scaleTicket',
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('does not match the "Event Value"');
  });

  it('should return an extraction failed error when text extractor throws', async () => {
    jest
      .spyOn(textExtractor, 'extractText')
      .mockRejectedValue(new Error('boom'));

    const result = await verifyScaleTicketNetWeight({
      config: {
        scaleTicketLayout: 'layout1',
        verificationType: 'scaleTicket',
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('could not be processed');
  });

  it('should build a scale ticket verification context', () => {
    const config = {
      scaleTicketLayout: 'layout1' as const,
      verificationType: 'scaleTicket' as const,
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
    jest.spyOn(textExtractor, 'extractText').mockResolvedValue({
      blocks: [],
      rawText: '',
    } as never);

    const result = await verifyScaleTicketNetWeight({
      config: {
        scaleTicketLayout: 'layout-unsupported' as unknown as 'layout1',
        verificationType: 'scaleTicket',
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('could not be processed');
  });
});
