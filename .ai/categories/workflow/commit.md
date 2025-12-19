---
title: "Commit Message Standards"
description: "Conventional Commits specification for clear, consistent commit messages"
category: "workflow"
priority: "required"
appliesTo: ["all"]
tools: ["cursor", "claude", "copilot", "all"]
version: '1.1.1'
lastUpdated: '2025-12-05'
relatedRules: ["branch-naming.md", "pull-request.md"]
---

# Commit Message Standards

This guide defines how to write clear, consistent commit messages using the Conventional Commits specification.

## Format

- **Structure**: `<type>(optional scope): <description>`
- **Examples**:
  - `feat(web): add real-time data updates to dashboard`
  - `fix(api): resolve overflow in staking rewards calculation`

## Requirements

- **MUST** follow Conventional Commits
- **MUST** use imperative mood (add, fix, update; not added, fixed, updated)
- **MUST** start description with lowercase letter
- **MUST NOT** end description with a period
- **MUST** keep full header ≤ 100 characters
- **SHOULD** keep the description (subject) ≤ 72 characters for readability
- **SHOULD** include a scope when the change affects a specific module or area
- **SHOULD** include a body for complex or multi-part changes

## Allowed types (ordered by frequency)

- **feat**: new feature or functionality
- **fix**: bug fix or error correction
- **refactor**: code restructuring without functional changes
- **docs**: documentation changes only
- **test**: adding or modifying tests
- **style**: formatting, whitespace, semicolons (no logic changes)
- **perf**: performance improvements
- **build**: build system or dependency changes
- **ci**: CI/CD configuration changes
- **chore**: maintenance tasks, tooling, configuration
- **revert**: revert a previous commit

## Project scopes: domains and main scopes

- Use a domain as the primary scope when changes affect a specific business domain/entity
- Optionally append a single main scope to the domain using `/` for extra clarity
- Main scopes can also be used standalone when no specific domain applies

Search for `commitlint.config.js` in the repo for the latest list of scopes.

## AI generation checklist

1. Analyze the diff to understand what changed
2. Pick the most specific applicable scope
3. Use imperative mood and start with lowercase
4. Keep header ≤ 72 chars; prefer subject ≤ 50 chars
5. Include technical details when relevant (functions, endpoints, contracts)
6. Follow Conventional Commits strictly
7. Consider the Carrot Foundation business context
8. Use appropriate Web3/AI/fintech terminology
9. Optimize for clarity and searchability
10. Prefer more specific scopes when in doubt

Remember: Good commit messages make history readable and debugging easier.

