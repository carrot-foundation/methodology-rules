# AGENTS.md

Methodology Rules AI instructions for Codex, Claude, and Cursor with equal capability parity.

## Equality rule

- Cursor, Claude, and Codex are treated as equals.
- No platform is primary for instruction definition.
- Canonical source: `.ai/`.

## Canonical workflow

1. Edit canonical files in `.ai/`.
2. Run `pnpm ai:sync` to regenerate platform adapters.
3. Run `pnpm ai:check` to validate parity and links.

## Current capability counts

- Rules: 14
- Skills: 13
- Agents/Roles: 3

## Available skills

- `apply-methodology` - Apply an existing rule processor to a specific methodology using the apply script.
- `check` - Run lint, typecheck, and test checks on affected projects to verify code quality.
- `coderabbit` - Triage and address CodeRabbit automated review comments on a pull request.
- `commit` - Stage files and create a conventional commit with a well-formed message.
- `create-branch` - Create a new git branch from latest main using the naming convention.
- `create-pr` - Analyze changes and create a pull request using the gh CLI with repo conventions.
- `create-rule` - Scaffold a new rule processor, implement the evaluation logic, and write tests.
- `debug` - Systematically diagnose and fix errors, test failures, and unexpected behavior.
- `finish-work` - Run quality gates, commit changes, push branch, and create a pull request.
- `review-pr` - Analyze a pull request diff and provide structured feedback on correctness, conventions, and quality.
- `task-exec` - Autonomously implement a task following project conventions with iterative verification.
- `unit-test` - Write Vitest unit tests following project conventions with proper stubs and assertions.
- `zod` - Create and modify Zod schemas for runtime validation with proper type inference.

## Rule mappings

- `rule-code-comments` - Keep comments meaningful by explaining intent rather than restating code
- `rule-code-preservation` - Protect existing code, tests, and features from unintended removal or modification
- `rule-code-style` - Maintain readable, consistent, and well-structured TypeScript code across the monorepo
- `rule-commit` - Enforce Conventional Commits format for consistent and parseable commit history
- `rule-document-extractor` - Enforce field-neutral parser design and layout conventions for the document extractor framework
- `rule-error-handling` - Ensure errors are validated, propagated, and logged correctly across Lambda handlers and shared libraries
- `rule-lambda` - Enforce thin Lambda handler patterns that delegate to processors
- `rule-module-boundaries` - Enforce Nx module boundary rules and dependency constraints between libraries
- `rule-naming-conventions` - Enforce consistent naming patterns for identifiers, files, and project structure
- `rule-pull-request` - Standardize pull request creation and review workflow using gh CLI
- `rule-rule-processors` - Enforce the standard structure and patterns for methodology rule processors
- `rule-schemas` - Enforce Zod schema conventions for runtime validation and type derivation
- `rule-testing` - Ensure consistent, safe, and maintainable test practices using Vitest and schema-driven data generation
- `rule-typescript` - Enforce TypeScript strict-mode conventions and type safety across the codebase

## Agent roles

- `debugger` - Debugging specialist for errors, test failures, and unexpected behavior in rule processors and Lambda functions
- `security-reviewer` - Security specialist for AWS Lambda, secrets handling, input validation, and sensitive data in rule processors
- `verifier` - Quality gate agent that validates code changes pass all project checks before completion

## Canonical references

- `.ai/README.md`
- `.ai/DEFINITIONS.md`
- `.ai/STANDARDS.md`
- `.ai/PARITY_MATRIX.md`
- `.ai/PROJECT_CONTEXT.md`

## Runtime adapter paths

- Cursor: `.cursor/rules/`, `.cursor/skills/`, `.cursor/agents/`
- Claude: `.claude/settings.json`, `.claude/skills/`, `.claude/agents/`
- Codex: `.agents/skills/`, `AGENTS.md`

# Methodology Rules Project Context

Project-specific knowledge for AI assistants working on Methodology Rules. This content is appended to generated root adapters (`CLAUDE.md` and `AGENTS.md`).

## Project Overview

Methodology Rules is an Nx monorepo containing AWS Lambda rule processors for Carrot Foundation's BOLD methodology. Each processor validates a specific aspect of waste management documents (MassIDs, certificates, credit orders) by querying S3-stored documents and reporting results to Smaug via SigV4-signed HTTP requests.

## Technology Stack

- **Monorepo**: Nx 22.6.1 workspace with pnpm 10.18.3
- **Node**: 22.15.0 (see `.nvmrc`)
- **TypeScript**: 5.9.3 with strict mode
- **Runtime**: AWS Lambda (Node.js)
- **Testing**: Vitest 4.1.0 with @vitest/coverage-v8
- **Validation**: Zod 4.3.6 for runtime type validation
- **Logging**: pino 10.3.1 with pino-pretty
- **Observability**: @sentry/aws-serverless 10.45.0
- **Math**: bignumber.js 10.0.2 (10 decimal places, ROUND_DOWN)
- **Geo**: geolib 3.3.4 for geolocation validation
- **Document extraction**: @aws-sdk/client-textract for OCR, pdf-lib for PDF manipulation
- **AWS SDKs**: @aws-sdk/client-s3, @aws-sdk/client-sts, @smithy/signature-v4
- **Build**: @nx/webpack with tsc compiler for Lambda bundling

## Architecture

### Directory Structure

```text
libs/
  methodologies/
    bold/                              # BOLD Mass ID methodology
      rule-processors/
        mass-id/                       # 20 rule processors for MassID documents
          composting-cycle-timeframe/
          document-manifest-data/
          driver-identification/
          drop-off-at-recycler/
          geolocation-and-address-precision/
          hauler-identification/
          mass-id-qualifications/
          mass-id-sorting/
          no-conflicting-certificate-or-credit/
          participant-accreditations-and-verifications-requirements/
          prevented-emissions/
          processor-identification/
          project-boundary/
          project-period-limit/
          recycler-identification/
          regional-waste-classification/
          vehicle-identification/
          waste-mass-is-unique/
          waste-origin-identification/
          weighing/
        mass-id-certificate/           # 1 processor for certificate documents
          rewards-distribution/
        credit-order/                  # 1 processor for credit order documents
          rewards-distribution/
    bold-carbon/                       # BOLD Carbon Certificate methodology
      rules/                           # 1 rule set
    bold-recycling/                    # BOLD Recycling Credit Order methodology
      rules/                           # 1 rule set

  shared/                              # Shared libraries (processors → shared only)
    app/                               # Application types (RuleDataProcessor base)
    aws-http/                          # AWS HTTP request helpers
    cli/                               # CLI utilities (rule-runner, document-extractor)
    cloudwatch-metrics/                # CloudWatch metrics publishing
    document/                          # Document loader and query services
    document-extractor/                # Generic document extraction
    document-extractor-recycling-manifest/  # Recycling manifest extractor
    document-extractor-scale-ticket/   # Scale ticket extractor (Textract OCR)
    document-extractor-transport-manifest/  # Transport manifest extractor
    env/                               # Environment variable access
    helpers/                           # Common utilities (logger, isNil, etc.)
    http-request/                      # HTTP request utilities
    lambda/                            # Lambda wrapper and types
    methodologies/                     # Methodology-specific shared code (matchers, types, utils)
    rule/                              # Rule result, types, standard-data-processor
    s3-bucket/                         # S3 bucket operations
    testing/                           # Test utilities and stubs
    text-extractor/                    # Text extraction abstractions
    types/                             # Shared TypeScript types
```

### Processor Layout Pattern

Each rule processor follows this file structure:

```text
libs/methodologies/{methodology}/rule-processors/{document-type}/{processor-name}/
  src/
    {name}.lambda.ts           # Lambda entry point (wrapRuleIntoLambdaHandler)
    {name}.processor.ts        # Core validation logic (extends RuleDataProcessor)
    {name}.rule-definition.ts  # Rule metadata (name, slug, version, events)
    {name}.errors.ts           # Custom error classes
    {name}.helpers.ts          # Pure helper functions
    {name}.constants.ts        # Constants and result comment strings
    {name}.types.ts            # TypeScript type definitions
    {name}.validators.ts       # Zod validators (optional)
    {name}.processor.spec.ts   # Processor unit tests
    {name}.helpers.spec.ts     # Helper unit tests
    {name}.lambda.e2e.spec.ts  # Lambda E2E tests
    {name}.test-cases.ts       # Test case data
    index.ts                   # Public exports
```

### Module Boundaries

- Processors depend on `libs/shared/` only — no cross-processor imports
- Shared methodology code lives in `libs/shared/methodologies/bold/`
- Each processor is an independent Nx project with its own `project.json`

### Processing Pipeline

```text
RuleInput (S3 event reference)
  → Lambda handler (wrapRuleIntoLambdaHandler)
    → Processor (extends RuleDataProcessor)
      → DocumentQueryService (queries S3 for related documents)
        → provideDocumentLoaderService / CachedDocumentLoaderService
      → Validation logic (BigNumber.js, geolib, Zod, Textract)
      → mapToRuleOutput (APPROVED / NOT_APPROVED / NOT_APPLICABLE)
    → SigV4-signed POST to Smaug API (audit result)
```

## Key Patterns

- **BigNumber.js**: All numeric comparisons use `BigNumber` with 10 decimal places and `ROUND_DOWN` to avoid floating-point errors
- **geolib**: Geolocation distance calculations and polygon containment checks
- **Textract**: OCR for scale ticket and transport manifest verification via `@aws-sdk/client-textract`
- **STS AssumeRole**: Lambda assumes a cross-account role (`SMAUG_API_GATEWAY_ASSUME_ROLE_ARN`) to sign requests to Smaug API
- **CachedDocumentLoaderService**: Caches S3 document fetches within a single Lambda invocation
- **DocumentQueryService**: Traverses document relationship graphs in S3 to find related documents
- **Rule definitions**: Each processor exports a `ruleDefinition` with `name`, `slug`, `version`, and `events` (satisfies `BaseRuleDefinition`)
- **Test stubs**: Reuse stubs from `@carrot-fndn/shared/testing` and colocated `*.stubs.ts` files
- **aws-sdk-client-mock**: Used for mocking AWS SDK clients in tests

## Common Commands

### Development

```bash
# Run tests for a specific processor
pnpm test <project-name>               # nx test <project-name>

# Run linting
pnpm lint <project-name>               # nx lint <project-name>

# TypeScript type check
pnpm ts <project-name>                 # tsc --noEmit

# Build a Lambda
pnpm build-lambda <project-name>       # nx build-lambda <project-name>

# Package a Lambda (zip)
# nx package-lambda <project-name>     # depends on build-lambda
```

### Affected Commands

```bash
# Test all affected projects
pnpm test:affected                     # nx affected --target test

# Lint all affected projects
pnpm lint:affected                     # nx affected --target lint --fix

# TypeScript check all affected
pnpm ts:affected                       # nx affected --target ts

# Build all affected Lambdas
pnpm build-lambda:affected             # nx affected --target build-lambda
```

### Run-Many Commands

```bash
# Test all projects
pnpm test:all                          # nx run-many --target test

# Lint all projects
pnpm lint:all                          # nx run-many --target lint --fix

# TypeScript check all
pnpm ts:all                            # nx run-many --target ts

# Build all Lambdas
pnpm build-lambda:all                  # nx run-many --target build-lambda
```

### Scaffolding and Tooling

```bash
# Create a new rule processor
pnpm create-rule

# Run a rule processor locally
pnpm run-rule -- <args>                # nx run rule-runner-cli:run -- <args>

# Extract document data
pnpm extract-document -- <args>        # nx run document-extractor-cli:run -- <args>

# Generate methodology rules manifest
pnpm generate:manifest

# Generate methodology framework rules
pnpm generate:methodology-framework-rules

# Generate rule READMEs
pnpm generate:readmes

# Generate methodology application READMEs
pnpm generate:methodology-readmes

# Upload Lambdas and metadata
pnpm upload-lambdas-and-metadata
```

### Versioning

```bash
# Bump application versions
pnpm bump:applications

# Bump rule versions
pnpm bump:rules
```

### AI Instructions

```bash
# Sync AI instructions to platform adapters
pnpm ai:sync

# Validate AI instruction parity
pnpm ai:check
```

### Utilities

```bash
# Commitizen (guided commit message)
pnpm commit                            # czg

# Validate package.json files
pnpm pkgJsonLint                       # npmPkgJsonLint .
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `DOCUMENT_BUCKET_NAME` | S3 bucket for methodology execution documents |
| `DOCUMENT_ATTACHMENT_BUCKET_NAME` | S3 bucket for document attachments (scale tickets, manifests) |
| `SMAUG_API_GATEWAY_ASSUME_ROLE_ARN` | IAM role ARN for STS AssumeRole to sign Smaug API requests |
| `AUDIT_URL` | Smaug API base URL for posting audit results |
| `AI_ATTACHMENT_VALIDATOR_API_URI` | Smaug API endpoint for AI-based attachment validation |
| `SENTRY_DSN` | Sentry DSN for error reporting |
| `ENVIRONMENT` | Deployment environment (development, staging, production) |
| `SOURCE_CODE_VERSION` | Build artifact version identifier |
| `SOURCE_CODE_URL` | GitHub repository URL |
| `ARTIFACT_CHECKSUM` | Build artifact checksum |
| `VALIDATE_ATTACHMENTS_CONSISTENCY_WITH_AI` | Feature flag for AI attachment validation |
| `ENABLE_CLOUDWATCH_METRICS` | Enable CloudWatch metrics publishing |
| `CLOUDWATCH_METRICS_NAMESPACE` | CloudWatch metrics namespace |

## Important Notes

- **Package Manager**: pnpm ONLY (enforced by `preinstall` script)
- **Node Version**: 22.15.0 (check `.nvmrc`)
- **Husky Hooks**: Git hooks for pre-commit linting via lint-staged
- **Cacheable Operations**: `build-lambda`, `test`, `lint`, `ts`, `package-lambda`
- **Remote Cache**: S3 bucket `carrot-nx-cache` (us-east-1)
- **Webpack**: Lambda bundling uses `@nx/webpack` with custom config in `.webpack/webpack.nx.config.js`
- **No cross-processor dependencies**: Each processor is isolated; shared code goes in `libs/shared/`
