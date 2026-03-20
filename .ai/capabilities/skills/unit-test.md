---
id: unit-test
name: Write Unit Tests
description: Write Vitest unit tests following project conventions with proper stubs and assertions.
when_to_use:
  - When writing tests for new or existing code
  - When asked to add test coverage
  - When a rule processor needs test cases
workflow:
  - Identify the module and functions to test
  - Set up test file with proper imports and stubs
  - Write test cases covering happy path, edge cases, and error scenarios
  - Run tests and verify they pass
inputs:
  - Source file or module to test
  - Optional specific scenarios to cover
outputs:
  - Test file(s) with passing unit tests
references:
  - package.json
---

# Write Unit Tests Skill

## Instructions

1. **File naming**: Use `*.spec.ts` for unit tests and `*.e2e.spec.ts` for end-to-end tests. Place test files alongside the source file they test.

2. **Test framework**: Use Vitest. Test environment variables are loaded from `.env-files/.env.test`.

3. **Test data generation**:
   - Use `@faker-js/faker` for random synthetic data (names, dates, numbers)
   - Use `zocker` with `createStubFromSchema()` for generating data from Zod schemas
   - Import shared test helpers from `@carrot-fndn/shared/testing`: `stubRuleInput()`, `stubDocument()`, `createStubFromSchema()`
   - **NEVER** use real data (company names, tax IDs, license plates, addresses, PII)

4. **Test structure**:
   - Use `describe` blocks to group related tests
   - Use `it.each` for table-driven tests when testing multiple similar scenarios
   - Use `expect.objectContaining()` for partial assertions on objects
   - Keep test descriptions clear and descriptive using `should` language

5. **Rule processor tests**: Follow the standard pattern:
   ```
   {rule-name}/
   ├── {rule-name}.processor.spec.ts   # Unit tests for evaluateResult()
   ├── {rule-name}.lambda.e2e.spec.ts  # E2E tests for the Lambda handler
   └── {rule-name}.test-cases.ts       # Shared test data and fixtures
   ```

6. **Assertions**:
   - Test both success and failure paths
   - Verify error messages and types, not just that errors are thrown
   - For rule processors, test that `evaluateResult()` returns the expected `RuleOutput`

7. **Run and verify**: Execute `pnpm nx test <project-name>` to run tests for the specific project. Ensure all tests pass before finishing.
