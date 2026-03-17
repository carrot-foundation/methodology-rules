import type { z } from 'zod';

interface ZodSafeParseResult {
  success: boolean;
  data?: unknown;
  error?: z.ZodError;
}

expect.extend({
  toBeValidValidationResult(actual: ZodSafeParseResult) {
    if (actual.success) {
      return {
        message: () => 'Expected validation to fail, but it succeeded',
        pass: true,
      };
    }

    return {
      message: () =>
        `Expected validation to succeed, but got errors: ${JSON.stringify(
          actual.error?.issues,
          null,
          2,
        )}`,
      pass: false,
    };
  },

  toBeInvalidValidationResult(actual: ZodSafeParseResult) {
    if (!actual.success) {
      return {
        message: () => 'Expected validation to succeed, but it failed',
        pass: true,
      };
    }

    return {
      message: () =>
        `Expected validation to fail, but it succeeded with data: ${JSON.stringify(
          actual.data,
          null,
          2,
        )}`,
      pass: false,
    };
  },
});
