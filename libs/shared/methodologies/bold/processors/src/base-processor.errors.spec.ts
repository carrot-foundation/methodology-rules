import { logger } from '@carrot-fndn/shared/helpers';
import { RuleFindingSchema } from '@carrot-fndn/shared/rule/types';
import {
  captureThrownError,
  createStubFromSchema,
} from '@carrot-fndn/shared/testing';
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
    it('should create an error with the message of a rendered finding', () => {
      const cause = new Error('cause');
      const error = processor.getKnownError(
        {
          finding: createStubFromSchema(RuleFindingSchema),
          message: 'test message',
        },
        { cause },
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('test message');
      expect(error.cause).toBe(cause);
    });
  });

  describe('getFailedResultFromError', () => {
    it('should return the message and finding of a known error', () => {
      const finding = createStubFromSchema(RuleFindingSchema);
      const error = processor.getKnownError({
        finding,
        message: 'test message',
      });

      expect(processor.getFailedResultFromError(error)).toEqual({
        resultComment: 'test message',
        resultFindings: [finding],
      });
    });

    it('should capture and rethrow an unknown Error with the same identity', () => {
      const error = new Error('unknown error');

      expect(
        captureThrownError(() => processor.getFailedResultFromError(error)),
      ).toBe(error);
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

      expect(
        captureThrownError(() => processor.getFailedResultFromError(error)),
      ).toBe(error);
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
