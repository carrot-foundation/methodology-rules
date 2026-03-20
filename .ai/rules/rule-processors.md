---
id: rule-processors
intent: Enforce the standard structure and patterns for methodology rule processors
scope:
  - "libs/methodologies/**/*.ts"
requirements:
  - Scaffold new rules using `pnpm create-rule <name> <scope> <description>` instead of manual file creation
  - Extend `ParentDocumentRuleProcessor<RuleSubject>` and implement the `evaluateResult()` method in the processor file
  - Follow the standard file naming convention with the rule name as prefix for all files in the rule directory
  - Include all required files: processor, lambda handler, unit spec, e2e spec, test-cases, index, project.json, vitest.config.ts
  - Apply rules to methodologies using `pnpm apply-methodology-rule <methodology> <rule> <scope>`
  - Import shared utilities only from `@carrot-fndn/shared/*` path aliases
  - Define test data in `{rule-name}.test-cases.ts` and share it between unit and e2e tests
anti_patterns:
  - Creating rule processor files manually instead of using the scaffolding script
  - Putting business logic in the Lambda handler instead of the processor class
  - Importing directly from another rule processor's internal files
  - Duplicating test data between spec and e2e spec files instead of using the shared test-cases file
  - Skipping the e2e spec file for a new rule processor
  - Using concrete values in test cases when `stubRuleInput()` or `createStubFromSchema()` would suffice
---

# Rule Processors Rule

## Rule body

Rule processors are the core units of methodology evaluation. Each processor validates a specific aspect of a document against Bold methodology requirements.

### Directory structure

Every rule processor must contain the following files:

```
{rule-name}/
├── {rule-name}.processor.ts       # Core logic
├── {rule-name}.lambda.ts          # Lambda handler (thin wrapper)
├── {rule-name}.processor.spec.ts  # Unit tests
├── {rule-name}.lambda.e2e.spec.ts # E2E tests
├── {rule-name}.test-cases.ts      # Shared test data
├── index.ts                       # Public exports
├── project.json                   # Nx project config
└── vitest.config.ts               # Vitest config
```

### Scaffolding

Always use the CLI tool to create new rules:

```bash
# Create a new rule
pnpm create-rule vehicle-validation mass-id "Validates vehicle data"

# Apply the rule to a methodology
pnpm apply-methodology-rule carbon-organic geolocation-precision mass-id
```

### Processor implementation

Processors extend `ParentDocumentRuleProcessor<RuleSubject>` and implement `evaluateResult()`:

```ts
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/rule';
import type { RuleSubject } from '@carrot-fndn/shared/rule';

export class VehicleValidationProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult(subject: RuleSubject): RuleOutput {
    // Business logic here
  }
}
```

### Test organization

Define reusable test data in `{rule-name}.test-cases.ts`:

```ts
import { stubRuleInput } from '@carrot-fndn/shared/testing';

export const validInput = stubRuleInput({
  // override only what this rule cares about
});

export const invalidInput = stubRuleInput({
  // data that should cause the rule to fail
});
```

Both `*.spec.ts` and `*.e2e.spec.ts` files should import from the test-cases file to keep assertions consistent.
