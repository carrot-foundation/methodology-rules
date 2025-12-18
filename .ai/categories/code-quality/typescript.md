---
title: 'TypeScript Guidelines'
description: 'TypeScript compiler settings, module organization, and best practices'
category: 'code-quality'
priority: 'required'
appliesTo: ['typescript']
tools: ['cursor', 'claude', 'copilot', 'all']
version: '1.1.1'
lastUpdated: '2025-12-05'
relatedRules: ['code-style.md']
---

# TypeScript Guidelines

### Compiler & language

- Respect `tsconfig.base.json`: `strict` true, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`, `exactOptionalPropertyTypes`.
- Use the provided path aliases (e.g., `@project-name/shared/*`); do not import via relative `../../..`.
- No `any` or unsafe casts; favor precise types and narrowing.

### Modules & barrels

- Import from library barrels (`src/index.ts`). Avoid deep imports into internal files.
- Keep public types exported from the barrel.

### Functions & variables

- Prefer explicit function return types for exported functions and public APIs.
- Meaningful identifiers; no 1–2 letter names; avoid abbreviations unless industry-standard.
- Use early returns and narrow unions with type guards.
- Organize constants, helpers, and types by file: `*.constants.ts`, `*.helpers.ts`, `*.types.ts`.

### Error handling

- Use `Result`-like patterns or typed errors. Do not swallow errors; add context.
- Use `typia` for input validation at module boundaries; prefer `type-fest` utility types and `@project-name/shared/types` where possible.

### Lint integration

- Follow root ESLint config (Airbnb base/typescript, SonarJS, Unicorn, Security, Promise, Perfectionist, Prettier).
- Avoid default exports unless:
  - Required by a framework (e.g., Next.js `app/` pages/layouts/components expecting default exports), or
  - Intentionally chosen for a library's public API surface.
