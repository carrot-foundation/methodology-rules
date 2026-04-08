---
name: 'Quality Check'
description: 'Run lint, typecheck, and test checks on affected projects to verify code quality.'
---

Run the three quality gates in order on affected projects:

1. **Lint**: `pnpm lint:affected`
2. **Typecheck**: `pnpm ts:affected`
3. **Test**: `pnpm test:affected`

If any step fails, diagnose and fix the issue, then re-run that step before proceeding.

To target a single project instead of all affected projects:

```bash
pnpm nx lint <project-name>
pnpm nx ts <project-name>
pnpm nx test <project-name>
```

The `ts` target name is the project-wide convention — it inherits its executor (`pnpm tsc -p {projectRoot}/tsconfig.eslint.json --noEmit`) from `targetDefaults` in `nx.json`. A handful of older rule-processor `project.json` files mis-declared the target as `"type-check": {}`, which has no matching `targetDefault` and silently fails with `Cannot find configuration for task <project>:type-check`. When you encounter that on a rule processor, fix the `project.json` to declare `"ts": {}` instead — do NOT introduce a new `type-check` target name.

All three checks must pass before the work is considered complete.
