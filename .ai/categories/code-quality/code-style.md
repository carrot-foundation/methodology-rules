---
title: 'Code Style Conventions'
description: 'Workspace TypeScript and JavaScript code style conventions'
category: 'code-quality'
priority: 'required'
appliesTo: ['typescript', 'javascript', 'all']
tools: ['cursor', 'claude', 'copilot', 'all']
version: '1.1.1'
lastUpdated: '2025-12-05'
relatedRules: ['typescript.md']
---

# Code Style Conventions

### Naming & clarity

- Use descriptive names; avoid abbreviations unless industry-standard (e.g., URL, ID, API). No 1–2 letter identifiers.
- Functions are verbs; variables are nouns. Prefer explicit return types for exported functions.

### Structure & files

- Cohesion-first: one responsibility per module.
- Organize by file type:
  - `*.constants.ts`: constants and enums
  - `*.types.ts`: types and interfaces (use `type-fest` utilities and `@project-name/shared/types` when helpful)
  - `*.helpers.ts`: pure functions/utilities
  - `*.dtos.ts`: DTOs if needed (NestJS)
- Use barrels (`src/index.ts`) for library exports; no deep imports.

### Control flow

- Favor guard clauses/early returns. Keep nesting shallow (<= 2 levels).
- Avoid inline anonymous blocks and deeply nested ternaries; prefer small functions.

### Dependencies & imports

- Use path aliases defined in `tsconfig.base.json`.
- Respect ESLint module boundaries and tags.

### Error handling & validation

- Validate inputs at boundaries using `typia` assertions; return typed results.
- Enrich errors with context; avoid silent failures.

### Testing discipline

- Tests live in `__tests__` folders, using `*.spec.ts(x)` filenames.
- Use helpers; organize with `describe` blocks; keep tests short and behavior-focused.
- Strive for 100% coverage where feasible; prioritize critical paths first.

### Performance & DX

- Prefer pure functions and immutable data structures where possible.
- Avoid premature optimization; measure first. Keep components and modules small and composable.

### Formatting & tooling

- Always end files with a single trailing empty line.
- After updating any file, run the formatter and linter with `--fix`.
