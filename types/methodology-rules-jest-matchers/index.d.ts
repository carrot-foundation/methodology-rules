declare namespace jest {
  interface Matchers<R> {
    toPassTypiaValidation(): R;
    toBeValidValidationResult(): R;
    toBeInvalidValidationResult(): R;
  }
}
