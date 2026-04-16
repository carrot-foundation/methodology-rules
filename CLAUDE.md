# CLAUDE.md

Claude adapter for Methodology Rules AI instructions. This file is generated from canonical `.ai/`.

## Equality rule

- Cursor, Claude, and Codex are configured as equals.
- Capability parity is mandatory across all three.
- Canonical source remains tool-agnostic in `.ai/`.

## Claude runtime

- Baseline settings: `.claude/settings.json`
- Skills: `.claude/skills/*/SKILL.md`
- Agents: `.claude/agents/*.md`

## Required workflow

1. Update canonical docs under `.ai/`.
2. Run `pnpm ai:sync`.
3. Run `pnpm ai:check`.

## Canonical references

- `.ai/README.md`
- `.ai/DEFINITIONS.md`
- `.ai/STANDARDS.md`
- `.ai/PARITY_MATRIX.md`
- `.ai/PROJECT_CONTEXT.md`

## Capability counts

- Rules: 14
- Skills: 13
- Agents/Roles: 3

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
