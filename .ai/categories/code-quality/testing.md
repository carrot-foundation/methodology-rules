---
title: 'Testing Standards'
description: 'Unit and component testing expectations for Jest-based test suites'
category: 'code-quality'
priority: 'required'
appliesTo: ['typescript', 'javascript']
tools: ['cursor', 'claude', 'copilot', 'all']
version: '1.1.1'
lastUpdated: '2025-12-05'
relatedRules: ['code-style.md', 'typescript.md']
---

# Testing Standards

### Unit tests (Jest)

- Tests live in `__tests__/` folders within the same directory as source files
- Example: `src/my-service.ts` → `src/__tests__/my-service.spec.ts`
- Filename pattern: `*.spec.ts(x)`
- Use framework-specific testing libraries (e.g., `@nestjs/testing` for Nest, Testing Library for React)
- Use shared testing helpers when available, keep tests short and simple, organized with `describe` blocks
- Aim for 100% coverage where feasible; write tests that target behavior, not implementation details
- Use `faker` for generating random inputs where helpful, but avoid randomness for expected values; prefer deterministic assertions
- Use type-safe fixture generators (e.g., `typia.random<T>()`) for type-shaped fixtures when appropriate
- Prefer `jest.mock` for external modules (e.g., `axios`, shared libs) and `jest.spyOn` for logger and side effects
- Use table-driven tests with `it.each` for input/output matrices
- Prefer matchers like `expect.objectContaining`/`not.objectContaining` for partial assertions
- Disallow `.only` (lint rule enabled) and skipped tests except when justified
