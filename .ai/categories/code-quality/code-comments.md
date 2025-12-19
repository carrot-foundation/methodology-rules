---
title: 'Code Comment Guidelines'
description: 'Guidance for essential code comments in TypeScript and JavaScript files'
category: 'code-quality'
priority: 'recommended'
appliesTo: ['typescript', 'javascript']
tools: ['cursor', 'claude', 'copilot', 'all']
version: '1.1.1'
lastUpdated: '2025-12-05'
relatedRules: ['code-style.md']
---

# Code Comment Guidelines

## Core Principles

- Favor self-documenting code; reach for comments only when the intent or constraints are not obvious from names and structure.
- Prefer explaining _why_ something exists, the invariants it relies on, or context that comes from outside the code.
- Avoid comments that simply restate the implementation, mirror type annotations, or paraphrase variable names.
- Delete or update comments whenever behavior changes—stale commentary is worse than none.

## When Comments Add Value

- **Domain or business context**: capture rules, policies, or edge cases that are not evident from the code alone.
- **Non-obvious algorithms or patterns**: explain unconventional control flow, performance optimizations, or defensive code paths.
- **Integration nuances**: document assumptions about external systems, protocols, or data contracts that readers cannot see locally.
- **Preconditions and invariants**: call out expectations (e.g., "Requires sorted input" or "Maintains LRU order") that guide safe use.
- **Suppressed warnings**: pair `// @ts-expect-error` or lint suppressions with a justification on the same line and a plan to remove them.

Use TSDoc/JSDoc blocks (`/** ... */`) sparingly for exported symbols when consumers need extra context that cannot live in the type signature alone—think side effects, required call order, or domain constraints. Inline `//` comments are preferred for short clarifications near the relevant logic.

## When Comments Are Harmful

- Obvious statements about what the code already says.
- Duplicating type information or parameter descriptions that TypeScript exposes.
- Narrating straightforward control flow (loops, conditionals) without additional insight.
- Commented-out code; rely on version control history.

```typescript
// ❌ Duplicates what TypeScript already reveals
function getUserById(id: string): User | undefined {
  // Find user by ID
  return users.find((user) => user.id === id);
}

// ✅ Conveys domain context that would be unclear otherwise
function calculateReward(input: RewardInput): number {
  // Applies regulatory cap: rewards may not exceed 20% of annual emissions
  return Math.min(input.base, input.emissions * 0.2);
}
```

## Style Checklist

- Position comments immediately above the code they describe; end-of-line comments are acceptable only for quick clarifications.
- Start sentences with capital letters; omit trailing periods for short phrases, include them for full sentences.
- Keep inline comments concise—rewrite the code if the explanation is longer than a couple of sentences.
- Prefer declarative tone for `//` comments ("Explain why caching is disabled") and imperative mood for the first sentence of TSDoc blocks.
- Use consistent section headers when grouping related fields or configuration blocks inside objects.

## Hygiene

- Re-evaluate comments during code reviews and refactors; delete any that no longer hold true.
- Do not include secrets, tokens, or sensitive identifiers in comments or examples.
- Reference external resources with stable links when they materially inform the behavior (specifications, RFCs, policy docs).
- If a comment documents a temporary workaround, annotate it with the issue or ticket that will remove it.
