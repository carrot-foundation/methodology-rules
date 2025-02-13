declare namespace jest {
  interface Matchers<R> {
    toPassTypiaValidation(): R;
  }
}
