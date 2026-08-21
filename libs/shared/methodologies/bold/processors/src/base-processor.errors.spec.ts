import { logger } from '@carrot-fndn/shared/helpers';
import * as Sentry from '@sentry/aws-serverless';

import { BaseProcessorErrors } from './base-processor.errors';

class TestProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to process request',
    SIMPLE_ERROR: 'Simple error message',
    WITH_PARAMS: (parameter: string) => `Error with param: ${parameter}`,
  };
}

vi.mock('@carrot-fndn/shared/helpers', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@sentry/aws-serverless', () => ({
  captureException: vi.fn(),
}));

describe('BaseProcessorErrors', () => {
  let processor: TestProcessorErrors;

  beforeEach(() => {
    processor = new TestProcessorErrors();
    vi.clearAllMocks();
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

    it('should capture and rethrow an unknown Error with the same identity', () => {
      const error = new Error('unknown error');
      let thrownError: unknown;

      try {
        processor.getResultCommentFromError(error);
      } catch (caughtError: unknown) {
        thrownError = caughtError;
      }

      expect(thrownError).toBe(error);

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'Unexpected error on "processKnownError" method',
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture and rethrow a non-Error value with the same identity', () => {
      const error = {
        message: 'not an error',
      };
      let thrownError: unknown;

      try {
        processor.getResultCommentFromError(error);
      } catch (caughtError: unknown) {
        thrownError = caughtError;
      }

      expect(thrownError).toBe(error);

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'Unexpected error on "processKnownError" method',
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
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
