---
title: "Branch Naming Rules"
description: "Git branch naming conventions aligned with Conventional Commits types and project scopes"
category: "workflow"
priority: "required"
appliesTo: ["all"]
tools: ["cursor", "claude", "copilot", "all"]
version: '1.1.1'
lastUpdated: '2025-12-05'
relatedRules: ["commit.md", "pull-request.md"]
---

# Branch Naming Rules

Follow these conventions for all branches. Names should be concise, descriptive, and machine-friendly.

## Format

- Preferred: `<type>/<short-description>`
- Alternate with scope: `<type>/<scope>-<short-description>`
- Ticket suffix variants: `<type>/<short-description>-<TICKET>` or `<type>/<scope>-<short-description>-<TICKET>`
- Ticket prefix variants: `<TICKET>/<type>/<short-description>` or `<TICKET>/<type>/<scope>-<short-description>`

Where:

- `type` is one of: `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`, `chore`, `revert`
- `scope` (optional) uses the same scopes as commits - see [Commit Message Rules](./commit.md) for guidance on allowed scopes
- `short-description` is lowercase kebab-case with 3–6 words describing the change
- `TICKET` is an optional tracker ID like `CARROT-123`

## Rules

- Use lowercase and kebab-case for words
- Use only letters, digits, hyphens, and slashes
- Keep branches ≤ 60 characters when possible
- Avoid generic words like `update`, `changes`, `stuff`
- Do not include punctuation other than `-` and `/`
- One slash after `type` is preferred; additional slashes only for ticket prefix

## Special Branches

- Long-lived: `main`
- Release branches: `release/<version>` (semver, e.g., `release/1.2.3`)
- Hotfix branches: `hotfix/<short-description>` (use when patching production)
- Automated updates: `renovate/*` (allowed bot branches)

## Examples

- `feat/add-real-time-dashboard`
- `feat/web-add-real-time-dashboard`
- `fix/smart-contracts-prevent-overflow`
- `chore/infra-bump-node-20`
- `CARROT-123/feat/implement-auth-flow`
- `CARROT-123/feat/app-implement-auth-flow`
- `feat/terraform-add-s3-iam-policy-CARROT-456`
- `release/1.4.0`
- `hotfix/web-fix-csp-regression`

## Guidance

- Match your branch `type` and `scope` to your commit messages for consistency
- If unsure about `scope`, choose the most specific area touched by most changes
- Prefer short, clear descriptions; the PR title can carry extra context
- For the complete list of allowed scopes, refer to your project's `commitlint.config.js` or [Commit Message Rules](./commit.md)

