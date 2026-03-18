---
id: module-boundaries
intent: Enforce Nx module boundary rules and dependency constraints between libraries
scope:
  - "libs/**/*.ts"
requirements:
  - Import shared libraries exclusively through path aliases defined in `tsconfig.paths.json` (e.g. `@carrot-fndn/shared/methodologies/bold/helpers`)
  - Tag all libraries in their `project.json` to enable Nx boundary enforcement
  - Ensure rule processors only depend on shared libraries, never on other processor libraries
  - Respect the Nx dependency graph; run `pnpm nx graph` to visualize and verify dependencies
  - Place reusable utilities in the appropriate shared library rather than in a processor
anti_patterns:
  - Importing from another rule processor's source files (e.g. mass-id processor importing from credit-order)
  - Using relative paths that cross Nx library boundaries (e.g. `../../../shared/rule/src`)
  - Creating circular dependencies between shared libraries
  - Bypassing boundary rules with `// eslint-disable` on the module boundary lint rule
  - Duplicating shared logic in multiple processors instead of extracting to a shared library
---

# Module Boundaries Rule

## Rule body

Nx enforces strict module boundaries to keep the dependency graph clean and prevent coupling between unrelated parts of the codebase.

### Dependency rules

The architecture enforces a layered dependency model:

```
apps/methodologies/*  -->  libs/methodologies/bold/rule-processors/*
                                      |
                                      v
                           libs/shared/*  (helpers, lambda, rule, testing, etc.)
```

Key constraints:

- **Processors depend on shared only.** A rule processor under `libs/methodologies/bold/rule-processors/mass-id/` can import from `libs/shared/*` but never from `libs/methodologies/bold/rule-processors/credit-order/`.
- **Shared libraries are independent.** Shared libraries should not depend on processors or apps.
- **No circular references.** If library A imports from library B, then B must not import from A.

### Path aliases

Always use the configured path aliases for cross-library imports:

```ts
// Correct
import { getDocumentField } from '@carrot-fndn/shared/methodologies/bold/helpers';
import { stubDocument } from '@carrot-fndn/shared/testing';

// Wrong
import { getDocumentField } from '../../../shared/methodologies/bold/helpers/src';
```

### Verifying boundaries

Use the Nx dependency graph to check for violations:

```bash
pnpm nx graph
pnpm nx lint <project-name>  # includes module boundary checks
```

The `@nx/enforce-module-boundaries` ESLint rule will flag any import that violates the configured constraints.
