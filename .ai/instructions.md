# Carrot Foundation AI Instructions

This document provides a comprehensive overview of the Carrot Foundation's development guidelines. These are **general organizational standards** that apply across all projects, though **specific project guidelines may extend or refine these standards** when documented at the project level.

> **📌 Important**: This file is a compatibility layer and summary. See the [README.md](./README.md) for navigation and complete structure.

## Structure

The `.ai` folder is organized into categories:

- **Code Quality**: `categories/code-quality/` - Code style, TypeScript, testing, comments
- **Workflow**: `categories/workflow/` - Commits, PRs, branch naming, ClickUp tasks
- **Documentation**: `categories/documentation/` - Markdown standards
- **Meta**: `meta/` - How to use rules, versioning, tool integration, project extensions

See [README.md](./README.md) for complete navigation and [manifest.json](./manifest.json) for structured metadata.

## Project-Specific Extensions

**Important**: The `.ai/` folder contains **generic organizational rules**. Project-specific extensions are located **outside** the `.ai/` folder in standard locations:

- **Cursor**: `.cursor/rules/*-project.mdc` - Check for project-specific Cursor rules
- **Claude**: `CLAUDE.md` - Contains project-specific sections
- **Copilot**: `.github/copilot-instructions.md` - Project-specific Copilot instructions

See [meta/project-extensions.md](./meta/project-extensions.md) for complete extension discovery patterns.

**For this repository (middle-earth)**, check:

- `.cursor/rules/middle-earth-project.mdc` - Project-specific conventions
- `CLAUDE.md` - Project-specific sections

These extensions take precedence over generic rules for project-specific details.

## Code Style Guidelines

**Reference**: `.ai/categories/code-quality/code-style.md`

### Key Principles

- **Naming**: Use descriptive names, avoid abbreviations, functions are verbs, variables are nouns
- **Structure**: One responsibility per module, organize by file type (`*.constants.ts`, `*.types.ts`, `*.helpers.ts`, `*.dtos.ts`)
- **Control Flow**: Favor guard clauses and early returns, keep nesting ≤ 2 levels
- **Dependencies**: Use path aliases from `tsconfig.base.json`, respect ESLint module boundaries
- **Error Handling**: Validate inputs with `typia` assertions, enrich errors with context
- **Testing**: Tests in `__tests__` folders using `*.spec.ts(x)`, strive for 100% coverage
- **Performance**: Prefer pure functions and immutable data structures
- **Formatting**: End files with single trailing empty line, run formatter/linter with `--fix`

## TypeScript Guidelines

**Reference**: `.ai/categories/code-quality/typescript.md`

### Compiler Requirements

- Follow `tsconfig.base.json` settings: `strict` mode, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`
- Use provided path aliases, avoid relative imports (`../../..`)
- No `any` or unsafe casts, favor precise types

### Module Organization

- Import from library barrels (`src/index.ts`), avoid deep imports
- Export public types from barrels
- Explicit return types for exported functions and public APIs

### Best Practices

- Use `Result`-like patterns for error handling
- Input validation with `typia` at module boundaries
- Leverage `type-fest` utilities and `@project-name/shared/types`
- Follow ESLint config (Airbnb, SonarJS, Unicorn, Security, Promise, Perfectionist, Prettier)
- Avoid default exports except when required by frameworks or intentional API design

## Testing Standards

**Reference**: `.ai/categories/code-quality/testing.md`

- Tests in `__tests__/` folders with `*.spec.ts(x)` pattern
- Use framework-specific testing libraries
- Aim for 100% coverage where feasible
- Use `faker` and `typia.random<T>()` for test fixtures
- Prefer `jest.mock` for external modules, `jest.spyOn` for side effects
- Use table-driven tests with `it.each`
- Prefer `expect.objectContaining` for partial assertions

## Code Comments

**Reference**: `.ai/categories/code-quality/code-comments.md`

- Favor self-documenting code; comments only when intent isn't obvious
- Explain _why_, not _what_
- Use TSDoc/JSDoc sparingly for exported symbols
- Delete stale comments when behavior changes

## Commit Message Standards

**Reference**: `.ai/categories/workflow/commit.md`

### Format Requirements

- **Structure**: `<type>(optional scope): <description>`
- **MUST** follow Conventional Commits specification
- **MUST** use imperative mood (add, fix, update)
- **MUST** start description with lowercase letter
- **MUST NOT** end description with period
- **MUST** keep header ≤ 100 characters
- **SHOULD** keep description ≤ 72 characters

### Common Types (by frequency)

1. `feat` - new feature/functionality
2. `fix` - bug fix/error correction
3. `refactor` - code restructuring without functional changes
4. `docs` - documentation changes only
5. `test` - adding/modifying tests
6. `style` - formatting changes (no logic changes)
7. `perf` - performance improvements
8. `build` - build system/dependency changes
9. `ci` - CI/CD configuration changes
10. `chore` - maintenance tasks
11. `revert` - revert previous commit

### Scoping Strategy

- Use domain as primary scope when affecting specific business domain/entity
- Optionally append main scope to domain using `/` for clarity
- Check `commitlint.config.js` for latest scope definitions

## Pull Request Guidelines

**Reference**: `.ai/categories/workflow/pull-request.md`

### Workflow Process

1. **Gather Information**: Use git commands to analyze changes and affected projects
2. **Assess Context**: Ask for clarification if commits/changes are unclear
3. **Create Description**: Follow `.github/pull_request_template.md` structure
4. **Output Command**: Provide GitHub CLI command for manual execution

### PR Title Format

- **Clear and descriptive** (NOT Conventional Commit format)
- **Start with capital letter**, sentence case
- **Aim for 50-60 characters maximum**
- **Focus on outcome**, not implementation
- **Use plain English**, avoid technical jargon

### Description Requirements

- **MUST** use existing template at `.github/pull_request_template.md`
- **Remove** sections that don't apply (no empty/N/A sections)
- **Remove all HTML comments** (`<!-- -->`) after addressing content
- **Include** specific file paths, commands, testing instructions
- **Save** to `tmp/pull-requests/{branch-name}.md`
- **Complete** all applicable checklist items

## Branch Naming Conventions

**Reference**: `.ai/categories/workflow/branch-naming.md`

### Preferred Patterns

```text
<type>/<short-description>[-<TICKET>]
<type>/<scope>-<short-description>[-<TICKET>]
```

### Examples

```text
feat/web-add-real-time-dashboard
fix/smart-contracts-prevent-overflow
CARROT-123/feat/app-implement-auth-flow
```

## ClickUp Task Management Guidelines

**Reference**: `.ai/categories/workflow/clickup-task.md`

### Core Principles

- **Question everything**: Challenge assumptions, suggest improvements, prevent poorly-scoped work
- **Be concise**: Provide necessary context without being text-heavy
- **Be practical**: Include code snippets and specific implementation hints when helpful
- **Be ruthless with scope**: Aggressively suggest breaking down large tasks
- **Remove noise**: Delete optional sections that don't add value

### Task Metadata Requirements

- **Category**: Feature | Bug | Tech. Debt | Spike | Other
- **Scope**: Back | Front | Infra | Web3 | Other
- **Priority**: Low | Normal | High | Urgent
- **Effort (Fibonacci)**: 1 (≤1 day) | 2 (1-2 days) | 3 (2-3 days) | 5 (3-5 days)

### Task Template Structure

- **TL;DR**: Single sentence with context (max 25 words) - remove if redundant
- **Context**: Why this exists, background - remove if not adding value
- **Business Rules**: Specific constraints or requirements as checklist
- **Value Delivery**: Why, Value, For whom (always required)
- **Implementation Suggestions**: Architecture hints, code snippets, gotchas - remove if not specific
- **References**: Direct links to resources - remove if none provided
- **Definition of Done**: Specific, testable completion criteria as checklist (always required)

## Markdown Documentation Standards

**Reference**: `.ai/categories/documentation/markdown.md`

- Primary header (`# Title`) as first line
- Overview/Description within first 200 words
- Proper hierarchy (h1 → h2 → h3, no skipped levels)
- Sentence case for headers
- Always specify language for code blocks
- Use descriptive link text
- 80 character soft limit, 120 character hard limit

## Important Reminders

1. **Project-Specific Extensions**: Always check for project-specific guidelines that may extend or refine these general standards
2. **Template Usage**: PR descriptions MUST use existing templates when available
3. **Quality Gates**: Ask for clarification when commits, changes, or business context is unclear
4. **Web3/Fintech Context**: Consider Carrot Foundation's business domain when making decisions
5. **Tooling Integration**: Leverage ESLint, Prettier, and other configured tools
6. **Documentation**: Keep guidelines current and reference `commitlint.config.js` for latest scopes

## AI Usage Guidelines

**CRITICAL**: This instructions.md file provides only a **summary** of the guidelines. When working with specific tasks or when users ask for detailed guidance:

1. **Always read the source files** mentioned in the references when you need complete details
2. **Read each guideline file separately** when implementing specific features (e.g., read `.ai/categories/workflow/commit.md` when creating commits, `.ai/categories/workflow/pull-request.md` when creating PRs)
3. **Cross-reference multiple files** when tasks span multiple domains (e.g., TypeScript + Code Style guidelines)
4. **Verify current content** by reading the actual files rather than relying solely on this summary
5. **Check manifest.json** for structured metadata and rule discovery
6. **Read README.md** for navigation and structure overview
7. **Ask for clarification** if guideline files are unclear or conflicting

**File References for Direct Reading**:

- `.ai/categories/code-quality/code-style.md` - Complete code style guidelines
- `.ai/categories/code-quality/typescript.md` - Full TypeScript-specific standards
- `.ai/categories/code-quality/testing.md` - Testing standards
- `.ai/categories/code-quality/code-comments.md` - Code comment guidelines
- `.ai/categories/workflow/commit.md` - Detailed commit message specifications
- `.ai/categories/workflow/pull-request.md` - Complete PR workflow and template requirements
- `.ai/categories/workflow/branch-naming.md` - Branch naming conventions
- `.ai/categories/workflow/clickup-task.md` - Complete ClickUp task creation guideline
- `.ai/categories/documentation/markdown.md` - Markdown documentation standards

**Meta Documentation**:

- `.ai/README.md` - Navigation hub and quick start
- `.ai/manifest.json` - Structured metadata for all rules
- `.ai/meta/how-to-use.md` - How AI assistants should consume rules
- `.ai/meta/versioning.md` - Versioning strategy
- `.ai/meta/tool-integration.md` - Tool-specific integration guides

This ensures you have the most current and complete guidance for each specific task.

These guidelines ensure consistency across the Carrot Foundation organization while maintaining flexibility for project-specific requirements.
