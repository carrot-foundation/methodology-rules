import { is, type IValidation } from 'typia';

expect.extend({
  toPassTypiaValidation(actual: unknown) {
    if (!is<IValidation>(actual)) {
      return {
        message: () => `Expected value to be a typia validation result`,
        pass: false,
      };
    }

    if (!actual.success) {
      return {
        message: () =>
          `Expected errors to be empty, but got ${JSON.stringify(
            actual.errors,
            null,
            2,
          )}`,
        pass: false,
      };
    }

    return {
      message: () => `Expected errors to be empty`,
      pass: true,
    };
  },
});
