---
id: create-rule
name: Create Rule Processor
description: Scaffold a new rule processor, implement the evaluation logic, and write tests.
when_to_use:
  - When creating a new rule processor
  - When asked to add a new rule to a methodology
  - When scaffolding a new processor from scratch
workflow:
  - Run the create-rule scaffold script
  - Implement evaluateResult() in the processor
  - Write unit tests and e2e tests
  - Create shared test cases
inputs:
  - Rule name (kebab-case)
  - Scope (mass-id, credit-order, or mass-id-certificate)
  - Description of the rule
outputs:
  - Scaffolded rule processor with processor, lambda handler, tests, and test cases
references:
  - tools/create-rule.js
---

# Create Rule Processor Skill

## Instructions

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
   ├── index.ts
   ├── project.json
   └── vitest.config.ts
   ```

2. **Implement the processor**: In `{rule-name}.processor.ts`, implement the `evaluateResult()` method. The processor extends `ParentDocumentRuleProcessor<RuleSubject>`.

3. **Write test cases**: In `{rule-name}.test-cases.ts`, define shared test data using `@faker-js/faker` and `zocker`. Never use real data (no real company names, tax IDs, addresses, etc.).

4. **Write unit tests**: In `{rule-name}.processor.spec.ts`, test the core evaluation logic using the shared test cases.

5. **Write e2e tests**: In `{rule-name}.lambda.e2e.spec.ts`, test the Lambda handler end-to-end.

6. **Apply to a methodology** (if needed):

   ```bash
   pnpm apply-methodology-rule <methodology> <rule> <scope>
   ```

   Example: `pnpm apply-methodology-rule carbon-organic vehicle-validation mass-id`

7. **Verify**: Run `pnpm lint:affected && pnpm ts:affected && pnpm test:affected` to confirm everything passes.
