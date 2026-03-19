import 'vitest';

interface CustomMatchers<R = unknown> {
  toBeValidValidationResult(): R;
  toBeInvalidValidationResult(): R;
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
