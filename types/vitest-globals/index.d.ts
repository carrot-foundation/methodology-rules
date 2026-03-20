/// <reference path="../../node_modules/vitest/globals.d.ts" />

/**
 * Declare `vi` as a namespace so that type annotations like
 * `vi.Mock`, `vi.Mocked<T>`, and `vi.SpiedFunction<T>` resolve
 * in files that rely on vitest globals without explicit imports.
 *
 * All types re-export from vitest's actual type definitions.
 */
declare namespace vi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Procedure = (...args: any[]) => any;

  export type Mock<T extends Procedure = Procedure> =
    import('vitest').MockInstance<T>;

  export type Mocked<T> = import('vitest').Mocked<T>;
  export type MockedFunction<T extends Procedure> =
    import('vitest').MockedFunction<T>;
  export type MockedClass<T extends new (...args: any[]) => any> =
    import('vitest').MockedClass<T>;
  export type MockedObject<T> = import('vitest').MockedObject<T>;
  export type MockInstance<T extends Procedure = Procedure> =
    import('vitest').MockInstance<T>;

  /** @deprecated Use `MockInstance` instead */
  export type SpiedFunction<T extends Procedure> =
    import('vitest').MockInstance<T>;
}
