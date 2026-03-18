---
id: code-style
intent: Maintain readable, consistent, and well-structured TypeScript code across the monorepo
scope:
  - "*.ts"
  - "*.tsx"
requirements:
  - Use descriptive, unabbreviated names for variables, functions, parameters, and types
  - Name functions as verbs describing their action and variables as nouns describing their content
  - Use guard clauses and early returns to reduce nesting; keep nesting depth at two levels or fewer
  - Assign one clear responsibility to each module, file, and function
  - Use path aliases from tsconfig.base.json for cross-library imports
  - Run the project formatter and linter (`pnpm nx lint <project>`) after making changes
  - End every file with exactly one trailing newline
anti_patterns:
  - Deeply nested if/else chains or callback pyramids exceeding two levels of indentation
  - God functions that handle multiple unrelated concerns in a single body
  - Abbreviated or cryptic identifiers like `val`, `tmp`, `cb`, `res`, `idx` outside of single-line lambdas with obvious context
  - Mixing business logic with infrastructure concerns (e.g. S3 calls inside a rule evaluation function)
  - Relying on barrel files that re-export entire libraries; import from the specific module path
  - Leaving unused imports, variables, or parameters in committed code
---

# Code Style Rule

## Rule body

Code in this repository should be immediately readable by any team member without requiring extra context or tribal knowledge.

### Naming clarity

Choose names that convey meaning at the point of use:

```ts
// Clear
const documentExpirationDate = computeExpirationDate(document);

// Unclear
const d = calc(doc);
```

Functions should read as actions: `validateVehiclePlate`, `fetchCreditOrder`, `buildRuleOutput`. Variables should read as things: `ruleResult`, `parsedDocument`, `vehicleWeight`.

### Guard clauses and early returns

Flatten control flow by returning early for edge cases:

```ts
function evaluateResult(subject: RuleSubject): RuleOutput {
  if (!subject.document) {
    return { status: 'REJECTED', reason: 'Missing document' };
  }

  if (!subject.document.isValid) {
    return { status: 'REJECTED', reason: 'Invalid document' };
  }

  // Main logic at top indentation level
  return computeApproval(subject.document);
}
```

### Single responsibility

Each file and function should do one thing well. If a function needs a comment to separate "sections," it is likely doing too much. Extract helper functions with descriptive names.

### Formatting and linting

The project uses ESLint and Prettier via Nx. After changing code, verify it passes:

```bash
pnpm nx lint <project-name>
```

Every file must end with a single trailing newline (no trailing blank lines, no missing final newline).

### Imports

Use path aliases for anything outside the current library:

```ts
import { BoldHelpers } from '@carrot-fndn/shared/methodologies/bold/helpers';
```

Within the same library, use relative paths. Avoid deep relative paths that cross Nx project boundaries.
