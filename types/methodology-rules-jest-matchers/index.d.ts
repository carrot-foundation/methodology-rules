declare namespace jest {
  interface Matchers<R> {
    toBeValidValidationResult(): R;
    toBeInvalidValidationResult(): R;
  }
}
