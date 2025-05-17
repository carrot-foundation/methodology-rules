import { logger } from '@carrot-fndn/shared/helpers';
import * as Sentry from '@sentry/aws-serverless';

import { BaseProcessorErrors } from './base-processor.errors';

// Mock implementation for testing
class TestProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    REJECTED_BY_ERROR: 'Unable to process request',
    SIMPLE_ERROR: 'Simple error message',
    WITH_PARAMS: (parameter: string) => `Error with param: ${parameter}`,
  };
}

jest.mock('@carrot-fndn/shared/helpers', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@sentry/aws-serverless', () => ({
  captureException: jest.fn(),
}));

describe('BaseProcessorErrors', () => {
  let processor: TestProcessorErrors;

  beforeEach(() => {
    processor = new TestProcessorErrors();
    jest.clearAllMocks();
  });

  describe('getKnownError', () => {
    it('should create an error with the known error prefix', () => {
      const error = processor.getKnownError('test message');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('test message');
    });
  });

  describe('getResultCommentFromError', () => {
    it('should return the error message for known errors', () => {
      const error = processor.getKnownError('test message');
      const result = processor.getResultCommentFromError(error);

      expect(result).toBe('test message');
    });

    it('should return default message for unknown errors', () => {
      const error = new Error('unknown error');
      const result = processor.getResultCommentFromError(error);

      expect(result).toBe('Unable to process request');
      expect(logger.error).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should handle non-error objects', () => {
      const result = processor.getResultCommentFromError({
        message: 'not an error',
      });

      expect(result).toBe('Unable to process request');
      expect(logger.error).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('ERROR_MESSAGE', () => {
    it('should handle simple error messages', () => {
      expect(processor.ERROR_MESSAGE.SIMPLE_ERROR).toBe('Simple error message');
    });

    it('should handle error messages with parameters', () => {
      const result = processor.ERROR_MESSAGE.WITH_PARAMS('test');

      expect(result).toBe('Error with param: test');
    });
  });
});
