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
pnpm nx ts <project-name>       # Type check

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

```text
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

```text
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

```text
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

### No Real Data in Tests

**Never commit real data in test files or any file in the repository.** This includes:

- Company names (e.g. real client or partner names)
- Tax IDs (CPF, CNPJ)
- Vehicle license plates
- Addresses (street names, cities that identify real locations)
- Person names tied to real individuals
- Phone numbers, emails, or any other PII

Always use obviously fake, synthetic values. Examples:

- Companies: `VERDE CAMPO LTDA`, `EXEMPLO INDUSTRIAS`
- CNPJs: `11.222.333/0004-55`, `77.888.999/0001-22`
- Plates: `FKE1A23`, `HIJ3K56`
- Addresses: `Rua Modelo, 100`, `Av. Principal, 500`, `Cidade Centro`
- People: `Pedro Santos`, `Ana Ferreira`

When writing parser tests that include raw OCR text, ensure both the input text and the expected assertion values use fake data consistently.

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

## Document Extractor Framework

Parsers (`DocumentParser<T>`) are field-neutral — they do not determine which fields are required:

- All extracted fields are optional; parsers return `undefined` for missing ones
- Rule processors decide what fields are required for their context
- `reviewRequired` is triggered only by low confidence fields or low layout match score (< 0.5)
- `layoutId` and `layouts` use the `NonEmptyString` branded type; use `as NonEmptyString` casts on literals
- Only add default layouts in `defaults.ts` if a document type has stable, well-known layouts

## Troubleshooting

1. Check Node.js version matches `.nvmrc` (22.15.0)
2. Run `pnpm install` to ensure dependencies are installed
3. Check for lint errors with `pnpm lint:all`
4. Verify rule follows the correct processor structure

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
