# Carrot methodology rules

## Overview

This Nx monorepo contains reusable rule processors for BOLD methodologies (e.g., carbon and recycling). Rules are implemented in TypeScript, packaged as AWS Lambda handlers, and applied to specific methodologies via tooling. The repository standardizes how we create, test, build, and deploy validation logic for artifacts like `MassID`, `Certificate`, and credit ordering.

## Repository structure

- `apps/methodologies/` — methodology-specific apps (e.g., `bold-carbon`, `bold-recycling`) that wire rules into Lambda entrypoints
- `libs/methodologies/bold/rule-processors/` — shared, reusable rule processor libraries organized by domain (e.g., `mass-id`, `credit-order`)
- `tools/` — automation scripts to create and apply rules (e.g., `create-rule.js`, `apply-methodology-rule.js`)
- `scripts/` — workspace utilities (e.g., formatting and upload helpers)

## Requirements

- Node.js 22.15.0 (`nvm use` reads `.nvmrc`)
- pnpm (enforced via preinstall)
- Nx 21 workspace

```bash
nvm use
pnpm install
```

## Quick start

```bash
# Run tests and type checks
pnpm test:all
pnpm ts:all

# Lint and auto-fix
pnpm lint:all

# Build all Lambda targets
pnpm build-lambda:all
```

## Common tasks

### Create a new rule

```bash
pnpm create-rule <rule-name> <scope> <description>
# example
pnpm create-rule mass-id-sorting mass-id "Sorts MassID events deterministically"
```

### Apply a rule to a methodology

```bash
pnpm apply-methodology-rule <methodology-name> <rule-name> <scope>
# examples
pnpm apply-methodology-rule bold-carbon mass-id-sorting mass-id
pnpm apply-methodology-rule bold-recycling rewards-distribution credit-order
```

### Build and deploy

```bash
# Build affected Lambdas
pnpm build-lambda:affected

# Upload Lambdas and associated metadata
pnpm upload-lambdas-and-metadata
```

## Conventions

- TypeScript with strict typing; Jest for tests; ESLint + Prettier for style
- Rule naming: `[rule-name].processor.ts`; include README and tests
- Use `pnpm commit` (Commitizen) with conventional commits and approved scopes

## License

LGPL-3.0
