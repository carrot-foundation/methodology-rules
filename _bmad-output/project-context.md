---
project_name: 'methodology-rules'
user_name: 'CarrotDevTeam'
date: '2026-06-23'
sections_completed:
  [
    'technology_stack',
    'architecture_module_boundaries',
    'numeric_geo_correctness',
    'typescript',
    'validation_error_handling',
    'document_extractor',
    'testing',
    'generated_artifacts',
    'workflow',
  ]
existing_patterns_found: 15
status: 'complete'
rule_count: 42
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Nx** 22.6.1 monorepo · **pnpm** 10.18.3 ONLY (preinstall-enforced) · **Node** 24.14.1 (`.nvmrc`)
- **TypeScript** 5.9.3 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`)
- **Vitest** 4.1.0 + v8 coverage — NOT Jest
- **Zod** 4.3.6 runtime validation — NOT Typia
- **bignumber.js** (10 dp, ROUND_DOWN) · **geolib** · **@aws-sdk/client-textract** (OCR) · **@aws-sdk/client-s3** · **@smithy/signature-v4** · **pino** · **@sentry/aws-serverless**
- Build: `@nx/webpack` → Lambda bundles · Path alias: `@carrot-fndn/*`

## Critical Implementation Rules

### Architecture & Module Boundaries

- Rule processors depend on `libs/shared/*` ONLY — never import another processor's files.
- Cross-library imports via `@carrot-fndn/*` path aliases, never relative paths crossing Nx boundaries.
- Scaffold rules with `pnpm create-rule <name> <scope> <description>` — never hand-create files. Apply via `pnpm apply-methodology-rule <methodology> <rule> <scope>`.
- Processor extends `ParentDocumentRuleProcessor<RuleSubject>`, implements `evaluateResult()`. Required files: `.processor.ts`, `.lambda.ts`, `.processor.spec.ts`, `.lambda.e2e.spec.ts`, `.test-cases.ts`, `index.ts`, `project.json`, `vitest.config.ts`.
- Lambda handler is THIN: delegate to processor, use `@carrot-fndn/shared/lambda`, let unrecoverable errors propagate (AWS retry/DLQ). Don't swallow.
- Stateless helpers as arrow-const in `{name}.helpers.ts` (not private methods); result-comment templates + thresholds in `{name}.constants.ts`.

### Numeric & Geo Correctness (domain gotcha)

- ALL numeric comparisons use BigNumber — 10 decimals, ROUND_DOWN. Never raw JS float math.
- Geolocation distance/polygon checks via geolib.

### TypeScript

- `noUncheckedIndexedAccess` adds `| undefined` to indexed lookups — narrow before use.
- No `any` (use `unknown` + narrow) · no `!` non-null assertion without prior validation · no `@ts-ignore` (use `@ts-expect-error` + reason).
- Explicit return types on all exports · named exports only · infer types from Zod (`z.infer<typeof schema>`), don't duplicate.

### Validation & Error Handling

- Validate boundary inputs (Lambda entry, API responses, external data) with Zod `.safeParse()`/`.parse()`.
- Structured logging via pino (correlation IDs, document IDs, operation) — never `console.log`. Never log PII/tokens/full document bodies.
- Enrich caught errors with context before re-throwing.

### Document Extractor subsystem

- Parsers (`DocumentParser<T>`) field-neutral: all fields optional, return `undefined` not `""`.
- `reviewRequired` set by extraction confidence (layout score < 0.5), NOT business rules. Required-field decisions belong to processors.
- `NonEmptyString` for `layoutId`/`layouts`. Default layouts in `defaults.ts` only for stable formats.

### Testing

- Vitest. Share test data via `{name}.test-cases.ts` between unit + e2e. Prefer `stubRuleInput()`/`createStubFromSchema()` over concrete values; reuse `@carrot-fndn/shared/testing` stubs.
- E2E spec (`.lambda.e2e.spec.ts`) is mandatory for every processor.

### Generated Artifacts (do NOT hand-edit)

- After editing any `rules.config.ts`: run `pnpm generate:readmes`, `generate:manifest`, `generate:methodology-readmes`, `generate:methodology-framework-rules`.
- NEVER hand-edit `codecov.yml`, per-rule READMEs, or methodology-application READMEs (generated, carry "do not edit" header).
- After editing `.ai/**`: run `pnpm ai:sync` then `pnpm ai:check`.

### Workflow

- Conventional Commits `<type>(<scope>): <desc>` — scopes: `nx`|`rule`|`shared`|`script`, imperative + lowercase, header ≤100 chars.
- Before PR: `pnpm lint:affected`, `pnpm ts:affected`, `pnpm test:affected`.
- PR via gh CLI: `-a @me -r @carrot-foundation/developers -R carrot-foundation/methodology-rules` + type label (feature/bug/chore/docs/refactoring).
- Tri-tool parity (Cursor/Claude/Codex equal): canonical rules live in `.ai/rules/` → synced to `.cursor/rules/*.mdc` + `.claude/skills/rule-*`. Edit `.ai/`, then `pnpm ai:sync`.

### Canonical reference

- Full rule set: `.ai/rules/*.md` (15 rules, fields: `intent`/`requirements`/`anti_patterns`) + mirrored `rule-*` skills. This file is the lean reminder layer, not a replacement.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented; when in doubt, prefer the more restrictive option.
- For full detail on any rule, consult the canonical `.ai/rules/*.md` source.

**For Humans:**

- Keep this file lean and focused on agent needs — it is a reminder layer, not the source of truth.
- The source of truth is `.ai/rules/`; update there and run `pnpm ai:sync`, then reflect material changes here.
- Update when the technology stack changes; review periodically and remove rules that become obvious.

Last Updated: 2026-06-23
