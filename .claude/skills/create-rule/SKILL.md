---
name: 'Create Rule Processor'
description: 'Scaffold a new rule processor, implement the evaluation logic, and write tests.'
---

1. **Scaffold the rule** using the built-in script:

   ```bash
   pnpm create-rule <name> <scope> <description>
   ```

   - `<name>`: kebab-case rule name (e.g., `vehicle-validation`)
   - `<scope>`: processor group (`mass-id`, `credit-order`, or `mass-id-certificate`)
   - `<description>`: short description of what the rule validates

   This creates the standard file structure:

   ```
   {rule-name}/
   ├── {rule-name}.processor.ts
   ├── {rule-name}.lambda.ts
   ├── {rule-name}.processor.spec.ts
   ├── {rule-name}.lambda.e2e.spec.ts
   ├── {rule-name}.test-cases.ts
   ├── {rule-name}.rule-subject.ts
   ├── index.ts
   ├── project.json
   └── vitest.config.ts
   ```

2. **Define the rule subject schema**: In `{rule-name}.rule-subject.ts`, define a `*RuleSubjectSchema` using `z.object()` with the exact fields the rule needs. Export both the schema and the inferred type. Use `validateRuleSubjectOrThrow` as the standard validation entry point in the processor.

3. **Implement the processor**: In `{rule-name}.processor.ts`, implement the `evaluateResult()` method. The processor extends `ParentDocumentRuleProcessor<RuleSubject>`.

4. **Write test cases**: In `{rule-name}.test-cases.ts`, define shared test data using `@faker-js/faker` and `zocker`. Never use real data (no real company names, tax IDs, addresses, etc.).

5. **Write unit tests**: In `{rule-name}.processor.spec.ts`, test the core evaluation logic using the shared test cases.

6. **Write e2e tests**: In `{rule-name}.lambda.e2e.spec.ts`, test the Lambda handler end-to-end.

7. **Apply to a methodology** (if needed):

   ```bash
   pnpm apply-methodology-rule <methodology> <rule> <scope>
   ```

   Example: `pnpm apply-methodology-rule carbon-organic vehicle-validation mass-id`

8. **Verify**: Run `pnpm lint:affected && pnpm ts:affected && pnpm test:affected` to confirm everything passes.
