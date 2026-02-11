import type {
  AttachmentInfo,
  CrossValidationConfig,
  CrossValidationInput,
} from './cross-validation.types';
import type { DocumentExtractorService } from './document-extractor.service';
import type {
  BaseExtractedData,
  DocumentExtractorConfig,
  ExtractionOutput,
} from './document-extractor.types';

import { crossValidateAttachments } from './cross-validation.helpers';

interface TestEventData {
  documentType: string;
  expectedValue: string;
}

interface TestExtractedData extends BaseExtractedData {
  value: string;
}

const createMockExtractor = (
  extractResult?: ExtractionOutput<TestExtractedData>,
  error?: Error,
): DocumentExtractorService => ({
  extract: jest.fn().mockImplementation(() => {
    if (error) {
      return Promise.reject(error);
    }

    return Promise.resolve(extractResult);
  }),
});

const createConfig = (
  overrides?: Partial<CrossValidationConfig<TestEventData, TestExtractedData>>,
): CrossValidationConfig<TestEventData, TestExtractedData> => ({
  getExtractorConfig: (
    eventData: TestEventData,
  ): DocumentExtractorConfig | undefined => {
    if (eventData.documentType === 'CDF') {
      return {
        documentType: 'recyclingManifest',
        layouts: ['cdf-sinfat', 'cdf-custom-1', 'cdf-sinir'],
      };
    }

    if (eventData.documentType === 'MTR') {
      return {
        documentType: 'transportManifest',
        layouts: ['mtr-sinir', 'mtr-sigor', 'mtr-sinfat'],
      };
    }

    return undefined;
  },
  validate: () => ({ failMessages: [] }),
  ...overrides,
});

const createAttachmentInfo = (id: string): AttachmentInfo => ({
  attachmentId: id,
  s3Bucket: 'test-bucket',
  s3Key: `test-key-${id}`,
});

const createEventData = (
  documentType: string,
  expectedValue: string,
): TestEventData => ({
  documentType,
  expectedValue,
});

const createExtractionOutput = (
  overrides?: Partial<ExtractionOutput<TestExtractedData>>,
): ExtractionOutput<TestExtractedData> => ({
  data: {
    documentType: 'recyclingManifest',
    extractionConfidence: 'high',
    lowConfidenceFields: [],
    missingRequiredFields: [],
    rawText: 'test raw text' as never,
    value: 'extracted-value',
  },
  reviewReasons: [],
  reviewRequired: false,
  ...overrides,
});

describe('crossValidateAttachments', () => {
  it('should return empty result when inputs array is empty', async () => {
    const extractor = createMockExtractor();
    const config = createConfig();

    const result = await crossValidateAttachments([], config, extractor);

    expect(result).toEqual({
      failMessages: [],
      reviewReasons: [],
      reviewRequired: false,
    });
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it('should set reviewRequired when document type is unknown', async () => {
    const extractor = createMockExtractor();
    const config = createConfig();
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('UNKNOWN_TYPE', 'value'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContain(
      'Unknown document type, cannot perform cross-validation for attachment att-1',
    );
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it('should extract document and call validate function', async () => {
    const extractionOutput = createExtractionOutput();
    const extractor = createMockExtractor(extractionOutput);
    const validateFunction = jest.fn().mockReturnValue({ failMessages: [] });
    const config = createConfig({ validate: validateFunction });
    const eventData = createEventData('CDF', 'expected');
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData,
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(extractor.extract).toHaveBeenCalledWith(
      { s3Bucket: 'test-bucket', s3Key: 'test-key-att-1' },
      {
        documentType: 'recyclingManifest',
        layouts: ['cdf-sinfat', 'cdf-custom-1', 'cdf-sinir'],
      },
    );
    expect(validateFunction).toHaveBeenCalledWith(extractionOutput, eventData);
    expect(result.failMessages).toEqual([]);
    expect(result.reviewRequired).toBe(false);
  });

  it('should collect fail messages from validation', async () => {
    const extractionOutput = createExtractionOutput();
    const extractor = createMockExtractor(extractionOutput);
    const config = createConfig({
      validate: () => ({
        failMessages: ['Value mismatch: expected X got Y'],
      }),
    });
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('CDF', 'expected'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.failMessages).toEqual(['Value mismatch: expected X got Y']);
  });

  it('should set reviewRequired when extraction result requires review', async () => {
    const extractionOutput = createExtractionOutput({
      reviewReasons: ['Low confidence extraction'],
      reviewRequired: true,
    });
    const extractor = createMockExtractor(extractionOutput);
    const config = createConfig();
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('CDF', 'expected'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContain('Low confidence extraction');
  });

  it('should fail when extraction errors occur', async () => {
    const extractor = createMockExtractor(
      undefined,
      new Error('Extraction failed'),
    );
    const config = createConfig();
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('CDF', 'expected'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.failMessages[0]).toContain(
      'Document extraction failed for attachment att-1: Extraction failed',
    );
  });

  it('should fail with unknown error for non-Error exceptions', async () => {
    const extractor = createMockExtractor();

    (extractor.extract as jest.Mock).mockRejectedValue('string error');
    const config = createConfig();
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('CDF', 'expected'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.failMessages[0]).toContain('Unknown error');
  });

  it('should process multiple inputs and aggregate results', async () => {
    const extractionOutput = createExtractionOutput();
    const extractor = createMockExtractor(extractionOutput);
    let callCount = 0;
    const config = createConfig({
      validate: () => {
        callCount++;

        return {
          failMessages: callCount === 1 ? ['Error from first'] : [],
        };
      },
    });
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('CDF', 'value1'),
      },
      {
        attachmentInfo: createAttachmentInfo('att-2'),
        eventData: createEventData('MTR', 'value2'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(extractor.extract).toHaveBeenCalledTimes(2);
    expect(result.failMessages).toEqual(['Error from first']);
  });

  it('should continue processing after unknown document type', async () => {
    const extractionOutput = createExtractionOutput();
    const extractor = createMockExtractor(extractionOutput);
    const validateFunction = jest.fn().mockReturnValue({ failMessages: [] });
    const config = createConfig({ validate: validateFunction });
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('UNKNOWN', 'value1'),
      },
      {
        attachmentInfo: createAttachmentInfo('att-2'),
        eventData: createEventData('CDF', 'value2'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContain(
      'Unknown document type, cannot perform cross-validation for attachment att-1',
    );
    expect(extractor.extract).toHaveBeenCalledTimes(1);
    expect(validateFunction).toHaveBeenCalledTimes(1);
  });

  it('should collect reviewReasons from validate callback', async () => {
    const extractionOutput = createExtractionOutput();
    const extractor = createMockExtractor(extractionOutput);
    const config = createConfig({
      validate: () => ({
        failMessages: [],
        reviewReasons: ['Name similarity low: 45%'],
        reviewRequired: true,
      }),
    });
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('CDF', 'expected'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContain('Name similarity low: 45%');
    expect(result.failMessages).toHaveLength(0);
  });

  it('should continue processing after extraction error', async () => {
    const extractionOutput = createExtractionOutput();
    const extractor = createMockExtractor(extractionOutput);
    let callCount = 0;

    (extractor.extract as jest.Mock).mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        return Promise.reject(new Error('First extraction failed'));
      }

      return Promise.resolve(extractionOutput);
    });
    const validateFunction = jest.fn().mockReturnValue({ failMessages: [] });
    const config = createConfig({ validate: validateFunction });
    const inputs: CrossValidationInput<TestEventData>[] = [
      {
        attachmentInfo: createAttachmentInfo('att-1'),
        eventData: createEventData('CDF', 'value1'),
      },
      {
        attachmentInfo: createAttachmentInfo('att-2'),
        eventData: createEventData('CDF', 'value2'),
      },
    ];

    const result = await crossValidateAttachments(inputs, config, extractor);

    expect(result.failMessages[0]).toContain('First extraction failed');
    expect(extractor.extract).toHaveBeenCalledTimes(2);
    expect(validateFunction).toHaveBeenCalledTimes(1);
  });
});
