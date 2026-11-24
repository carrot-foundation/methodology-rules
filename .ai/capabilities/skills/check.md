---
id: check
name: Quality Check
description: Run lint, typecheck, and test checks on affected projects to verify code quality.
when_to_use:
  - Before committing changes
  - After making code changes
  - When verifying code quality
  - When asked to validate or check the project
workflow:
  - Run linting on affected projects
  - Run type checking on affected projects
  - Run tests on affected projects
  - If any check fails, fix the issue and re-run
inputs:
  - Project name (optional, to target a single project)
outputs:
  - Pass/fail status for lint, typecheck, and test
  - Error details for any failing checks
references:
  - package.json
---

# Quality Check Skill

## Instructions

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

The gate is read-only: `pnpm lint:affected` reports problems and never rewrites files. To apply
auto-fixes, run `pnpm lint:affected:fix` (or `pnpm nx lint <project-name> --fix`) as a separate
step that modifies the working tree, review the diff, then re-run the read-only gate.

All three checks must pass before the work is considered complete.
