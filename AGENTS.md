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
- `unit-test` - Write Jest unit tests following project conventions with proper stubs and assertions.
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
- `rule-testing` - Ensure consistent, safe, and maintainable test practices using Jest and schema-driven data generation
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

## Runtime adapter paths

- Cursor: `.cursor/rules/`, `.cursor/skills/`, `.cursor/agents/`
- Claude: `.claude/settings.json`, `.claude/skills/`, `.claude/agents/`
- Codex: `.agents/skills/`, `AGENTS.md`
