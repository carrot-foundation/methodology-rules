---
id: rule-processors
intent: Enforce the standard structure and patterns for methodology rule processors
scope:
  - 'libs/methodologies/**/*.ts'
requirements:
  - Scaffold new rules using `pnpm create-rule <name> <scope> <description>` instead of manual file creation
  - Extend `ParentDocumentRuleProcessor<RuleSubject>` and implement the `evaluateResult()` method in the processor file
  - Follow the standard file naming convention with the rule name as prefix for all files in the rule directory
  - Include all required files: processor, lambda handler, findings, unit spec, e2e spec, test-cases, index, project.json, vitest.config.ts
  - Apply rules to methodologies using `pnpm apply-methodology-rule <methodology> <rule> <scope>`
  - Import shared utilities only from `@carrot-fndn/shared/*` path aliases
  - Define test data in `{rule-name}.test-cases.ts` and share it between unit and e2e tests
  - Place stateless helper functions in `{rule-name}.helpers.ts` (not as private methods on the processor class) using arrow-`const` syntax (`export const myHelper = (...) => ...`)
  - Place result-comment templates and threshold constants in `{rule-name}.constants.ts`
  - Render every non-passing result comment through the rule's `{rule-name}.findings.ts` so the result carries `resultContent.findings`: a single message via `<RULE>_FINDINGS.result(...)`, several joined via `joinRenderedFindings`, a thrown error via `getKnownError(<RULE>_FINDINGS.render(...))`; the findings map covers every non-passing message key; set `dependsOnAccreditation` only on a finding that fails because the TEST synthetic accreditations do not provide, for the mass, the value it reads (today the recycler's GHG type, per-subtype baselines and sorting factor; Smaug runbook 02, "Expected failures on TEST"); reading the accreditation is not enough, and a doubtful case stays unset, because a marked finding is reported as not evaluated on every TEST run
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
├── {rule-name}.helpers.ts         # Stateless helpers (optional)
├── {rule-name}.constants.ts       # Result-comment templates and thresholds (optional)
├── {rule-name}.findings.ts        # Finding codes, default owners, accreditation dependencies
├── index.ts                       # Public exports
├── project.json                   # Nx project config
└── vitest.config.ts               # Vitest config
```

Stateless functions belong in `{rule-name}.helpers.ts` rather than as private methods on the processor class. Use arrow-`const` syntax (`export const myHelper = (...) => ...`), matching the existing helper-file convention. Result-comment templates and threshold constants live in `{rule-name}.constants.ts` and can compose small phrase-builder helpers to keep variants in sync.

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

### Findings

Render every non-passing result through the rule's `{rule-name}.findings.ts` so the result carries `resultContent.findings`: a single message renders via `<RULE>_FINDINGS.result(...)`, several joined messages via `joinRenderedFindings`, and a thrown error via `getKnownError(<RULE>_FINDINGS.render(...))`. A finding code (`<slug>.<GROUP>.<KEY>`) is a wire identifier consumers key on, so renaming a message key, a group or the rule slug is a breaking change. Set `dependsOnAccreditation` only on a finding that fails because the TEST synthetic accreditations do not provide, for the mass, the value it reads (today the recycler's GHG type, per-subtype baselines and sorting factor; Smaug runbook 02, "Expected failures on TEST"); reading the accreditation is not enough, and a doubtful case stays unset, because a marked finding is reported as not evaluated on every TEST run.

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
