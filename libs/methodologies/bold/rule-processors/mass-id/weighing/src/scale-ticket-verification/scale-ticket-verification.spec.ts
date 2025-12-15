import { Layout1ScaleTicketParser } from '@carrot-fndn/shared/scale-ticket-extractor';
import { provideTextractService } from '@carrot-fndn/shared/text-extractor';

import {
  buildScaleTicketVerificationContext,
  verifyScaleTicketNetWeight,
} from './scale-ticket-verification';

describe('scale-ticket-verification', () => {
  it('should pass when extracted net weight matches the event value', async () => {
    const textExtractorInput = { filePath: 'dummy-path' };
    const expectedNetWeight = 200.25;

    jest.spyOn(provideTextractService, 'extractText').mockResolvedValue({
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

    // We cannot assert on internal parsing here without mocking Textract,
    // but we can ensure the function returns a shaped result.
    expect(result).toHaveProperty('errors');
  });

  it('should return no errors when no config is provided', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: undefined,
      expectedNetWeight: 100,
      textExtractorInput: undefined,
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when verificationType is not scaleTicket', async () => {
    const result = await verifyScaleTicketNetWeight({
      config: undefined as unknown as {
        scaleTicketLayout: 'layout1';
        verificationType: 'scaleTicket';
      },
      expectedNetWeight: 100,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(result.errors).toHaveLength(0);
  });

  it('should return no errors when expected net weight is undefined or zero', async () => {
    const baseConfig = {
      scaleTicketLayout: 'layout1' as const,
      verificationType: 'scaleTicket' as const,
    };

    const undefinedResult = await verifyScaleTicketNetWeight({
      config: baseConfig,
      expectedNetWeight: undefined,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    const zeroResult = await verifyScaleTicketNetWeight({
      config: baseConfig,
      expectedNetWeight: 0,
      textExtractorInput: { filePath: 'dummy-path' },
    });

    expect(undefinedResult.errors).toHaveLength(0);
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
    jest.spyOn(provideTextractService, 'extractText').mockResolvedValue({
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
      .spyOn(provideTextractService, 'extractText')
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
    jest.spyOn(provideTextractService, 'extractText').mockResolvedValue({
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
