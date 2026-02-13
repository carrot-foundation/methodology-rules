# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Nx monorepo for implementing rule processors for Bold methodologies (carbon, recycling, organic waste management). Rule processors are deployed as AWS Lambda functions.

**Stack**: TypeScript, Nx 21.0.3, pnpm 10.18.3, Node.js 22.15.0, AWS Lambda, Jest

## Common Commands

```bash
# Development
pnpm test:affected           # Run tests for affected projects
pnpm lint:affected           # Lint affected projects
pnpm ts:affected             # Type check affected projects

# Run all
pnpm test:all                # Run all tests
pnpm lint:all                # Lint all projects
pnpm ts:all                  # Type check all projects

# Build
pnpm build-lambda            # Build all Lambda functions
pnpm build-lambda:affected   # Build affected Lambda functions

# Single project (replace <project-name>)
pnpm nx test <project-name>
pnpm nx lint <project-name>

# Rule management
pnpm create-rule <name> <scope> <description>
pnpm apply-methodology-rule <methodology> <rule> <scope>

# Example: create a new rule
pnpm create-rule vehicle-validation mass-id "Validates vehicle data"

# Example: apply rule to methodology
pnpm apply-methodology-rule carbon-organic geolocation-precision mass-id

# Commits (use conventional commits)
pnpm commit                  # Interactive conventional commit
```

## Architecture

```
libs/
├── methodologies/bold/rule-processors/
│   ├── mass-id/              # Mass ID rule processors
│   ├── credit-order/         # Credit order processors
│   └── mass-id-certificate/  # Certificate processors
└── shared/
    ├── methodologies/bold/   # Shared Bold utilities (getters, helpers, types)
    ├── document-extractor/   # Document parsing/extraction
    ├── lambda/               # Shared Lambda utilities
    ├── rule/                 # Rule framework
    └── ...                   # Other shared modules

apps/methodologies/           # Methodology applications (bold-carbon, bold-recycling)
tools/                        # Scripts (create-rule.js, apply-methodology-rule.js)
```

## Rule Processor Pattern

Each rule processor follows this structure:

```
{rule-name}/
├── {rule-name}.processor.ts       # Core logic (extends ParentDocumentRuleProcessor)
├── {rule-name}.lambda.ts          # Lambda handler
├── {rule-name}.processor.spec.ts  # Unit tests
├── {rule-name}.lambda.e2e.spec.ts # E2E tests
├── {rule-name}.test-cases.ts      # Shared test data
├── index.ts
├── project.json
└── jest.config.ts
```

Processors extend `ParentDocumentRuleProcessor<RuleSubject>` and implement `evaluateResult()`.

## Module Boundaries

Nx enforces module boundaries via tags:

- Processors can only import from `shared` libraries
- `mass-id` processors cannot import from `credit-order` processors
- Use path aliases: `@carrot-fndn/shared/methodologies/bold/helpers`

## Commit Conventions

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`
Scopes: `nx`, `rule`, `shared`, `script`

```
feat(rule): add vehicle definition validation
fix(shared): prevent racing of requests
```

## TypeScript Configuration

- Strict mode enabled with additional checks: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`
- Uses Typia for runtime type validation
- Path aliases configured in `tsconfig.paths.json`

## Testing

- Jest with ts-jest
- Test files: `*.spec.ts`, `*.e2e.spec.ts`
- Test env: `.env-files/.env.test`
- Coverage output: `./coverage/{projectRoot}`

## Pull Requests

Use gh CLI with these repo-specific settings:

```bash
gh pr create \
  -a @me \
  -r @carrot-foundation/developers \
  --label feature \
  -R carrot-foundation/methodology-rules \
  -t "feat(rule): your title here"
```

Labels: `feature`, `bug`, `chore`, `docs`, `refactoring`

## Troubleshooting

1. Check Node.js version matches `.nvmrc` (22.15.0)
2. Run `pnpm install` to ensure dependencies are installed
3. Check for lint errors with `pnpm lint:all`
4. Verify rule follows the correct processor structure
