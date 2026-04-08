---
id: testing
intent: Ensure consistent, safe, and maintainable test practices using Vitest and schema-driven data generation
scope:
  - "*.spec.ts"
  - "*.e2e.spec.ts"
  - "*.test-cases.ts"
requirements:
  - Use Vitest as the test runner; test environment is configured via `.env-files/.env.test`
  - Avoid `expect()` inside conditionals or loops (vitest/no-conditional-expect); throw to short-circuit instead
  - When an `it.each` delegates assertions to a helper, suppress vitest/expect-expect with an eslint-disable on the it.each line
  - `expect.stringContaining` and `expect.stringMatching` return `any`; precede the call with `// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment` (and re-add it if `lint --fix` strips it)
  - Generate test data with `@faker-js/faker` for primitives and `zocker` for schema-driven object generation
  - Use shared test helpers from `@carrot-fndn/shared/testing` including `stubRuleInput()`, `stubDocument()`, and `createStubFromSchema()`
  - Use `it.each` for table-driven tests when verifying the same logic across multiple input/output combinations
  - Use `expect.objectContaining` for partial assertions instead of asserting entire object structures
  - Place unit tests next to source files as `*.spec.ts` and end-to-end tests as `*.e2e.spec.ts`
  - Keep test data in a dedicated `*.test-cases.ts` file when shared across multiple test files
anti_patterns:
  - Committing real data in tests including company names, tax IDs (CPF/CNPJ), vehicle plates, addresses, person names, or any PII
  - Hardcoding UUIDs, dates, or numeric IDs when faker or zocker can generate them dynamically
  - Writing test logic inside `beforeAll`/`beforeEach` that should be a standalone test case
  - Sharing mutable state between test cases without proper setup/teardown isolation
  - Using `vi.mock` at the module level when a dependency-injection approach or per-test spy would be narrower and safer
  - Asserting on snapshot strings for logic validation; reserve snapshots for serialized output stability only
---

# Testing Rule

## Rule body

All test code in this repository runs under Vitest. Tests must be deterministic, isolated, and free of real-world data.

### Test file conventions

| Pattern | Purpose |
|---|---|
| `{name}.spec.ts` | Unit tests, co-located with source |
| `{name}.e2e.spec.ts` | End-to-end / integration tests |
| `{name}.test-cases.ts` | Shared test data and fixtures |

The test environment loads variables from `.env-files/.env.test`.

### Data generation

Never hardcode test values that could be randomized. Use the following tools:

- **`@faker-js/faker`** for primitive values (strings, numbers, dates, UUIDs).
- **`zocker`** for generating objects that conform to a Zod schema.
- **Shared stubs** from `@carrot-fndn/shared/testing`:
  - `stubRuleInput()` - creates a valid `RuleInput` with sensible defaults.
  - `stubDocument()` - creates a valid document fixture.
  - `createStubFromSchema()` - generates a stub from any Zod schema.

### No real data policy

Tests must never contain real-world identifiable information. Use obviously synthetic values:

| Field | Fake example |
|---|---|
| Company name | `VERDE CAMPO LTDA`, `EXEMPLO INDUSTRIAS` |
| CNPJ | `11.222.333/0004-55`, `77.888.999/0001-22` |
| Vehicle plate | `FKE1A23`, `HIJ3K56` |
| Address | `Rua Modelo, 100`, `Av. Principal, 500` |
| Person name | `Pedro Santos`, `Ana Ferreira` |

This applies to raw OCR text fixtures as well: both the input text and expected assertion values must use fake data consistently.

### Table-driven tests

When a function must be tested against multiple scenarios, use `it.each`:

```ts
it.each([
  { input: 0, expected: 'zero' },
  { input: 1, expected: 'one' },
  { input: 2, expected: 'two' },
])('converts $input to "$expected"', ({ input, expected }) => {
  expect(numberToWord(input)).toBe(expected);
});
```

### Partial assertions

Prefer `expect.objectContaining` when only a subset of fields matters for the assertion. This keeps tests resilient to unrelated field additions:

```ts
expect(result).toEqual(
  expect.objectContaining({
    status: 'APPROVED',
    score: expect.any(Number),
  }),
);
```
