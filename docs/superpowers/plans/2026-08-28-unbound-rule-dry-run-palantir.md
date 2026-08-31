# Palantir platform-boundary guardrails implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Palantir's content-agnostic document/event ownership explicit across agent adapters and reject methodology/rule execution endpoints at CI time.

**Architecture:** A canonical platform-boundary document defines the allowed document/event API responsibilities and the read-only presentation exception. Claude, Codex, and Cursor project instructions link to that source. A dependency-free TypeScript-AST check inspects only Nest API route and feature-module ownership surfaces, so arbitrary document payloads and public presentation vocabulary remain valid.

**Tech Stack:** Node.js 24.13.1, TypeScript 5.9.3 compiler API, node:test, Nx, pnpm 10.28.2, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-08-28-unbound-rule-dry-run-design.md`

## Global constraints

- Do not restore or replace the closed methodology-execution endpoint.
- Palantir APIs own generic document/event storage, authorization, lifecycle invariants, and delivery; methodology selection, rule execution, audit execution, and consumer-specific projections belong downstream.
- `document-public` may render methodology-labelled values already present in documents; this does not authorize methodology execution APIs.
- Inspect route decorators and API feature-module ownership only. Never scan DTO fields, payloads, event metadata, fixtures, or presentation configuration.
- Use the installed TypeScript compiler API; add no dependency.
- Correct the complete duplicated Smaug Cursor adapter set instead of patching one file.
- Before Task 4, set `CLOSED_ENDPOINT_WORKTREE` to the absolute path of the operator-supplied, unmodified closed endpoint worktree.
- Never merge or deploy; stop at a merge-ready PR.

---

### Task 1: Establish one platform-boundary source and correct adapters

**Files:**
- Create: `docs/architecture/platform-boundaries.md`
- Modify: `CLAUDE.md`
- Create: `AGENTS.md`
- Replace: `.cursor/rules/smaug-project.mdc` with `.cursor/rules/palantir-project.mdc`
- Modify: `.cursor/rules/commit.mdc`
- Modify: `.cursor/rules/branch-naming.mdc`
- Modify: `.cursor/rules/pull-request.mdc`
- Modify: `.cursor/rules/pull-request-description.mdc`
- Modify: `.cursor/rules/http-request.mdc`
- Modify: `.cursor/rules/nestjs.mdc`
- Modify: `.cursor/commands/commit.md`
- Modify: `.cursor/commands/create-branch.md`
- Modify: `.cursor/commands/create-pr.md`
- Modify: `.cursor/commands/task-exec.md`

**Interfaces:**
- Produces: tool-neutral platform ownership plus thin, consistent project adapters.

- [ ] **Step 1: Record the complete stale-adapter baseline**

```bash
rtk git grep -n -i -E '\bsmaug\b|@smaug/' origin/main -- .cursor CLAUDE.md .ai
```

Classify legitimate references to Smaug handlers/data-surgery separately from copied Smaug project instructions and imports.

- [ ] **Step 2: Write the canonical current-state boundary**

`docs/architecture/platform-boundaries.md` must state:

- document-external owns generic document/event authorization, validation, lifecycle, and propagation;
- document-core owns internal persistence, privacy, compliance, and event sourcing;
- participant-core owns PII;
- consumer-specific methodology/rule/audit execution and execution-input projections do not belong in Palantir APIs;
- document-public may present known values already carried by content, without owning their execution semantics.

- [ ] **Step 3: Correct every project adapter**

Change CLAUDE's ambiguous “Business rules” label to “generic document/event lifecycle rules” and link the canonical boundary. Add a concise `AGENTS.md` that requires `.ai/instructions.md` and the canonical boundary. Replace the Smaug project Cursor file and correct every copied Smaug repository/import/command reference identified in Step 1. Keep generic Carrot rules; do not narrate the migration history.

- [ ] **Step 4: Verify instruction consistency**

```bash
rtk git grep -n -i -E 'Smaug project|@smaug/|carrot-foundation/smaug' -- .cursor AGENTS.md
rtk git diff --check
```

Expected: no copied Smaug project/import/repository guidance remains. Legitimate architecture references in CLAUDE/docs are preserved.

- [ ] **Step 5: Commit exact instruction paths**

```bash
rtk git add docs/architecture/platform-boundaries.md CLAUDE.md AGENTS.md .cursor
rtk git commit -m "docs(architecture): define platform ownership boundary"
```

### Task 2: Detect consumer-specific API ownership

**Files:**
- Create: `tools/scripts/src/check-platform-boundaries/check-platform-boundaries.mjs`
- Create: `tools/scripts/src/check-platform-boundaries/__tests__/check-platform-boundaries.spec.mjs`
- Modify: `tools/scripts/project.json`
- Modify: `.github/workflows/verify.yaml`

**Interfaces:**
- Produces: `checkPlatformBoundaries({ repositoryRoot }): BoundaryViolation[]`, a CLI exit code, and Nx target `scripts:check-platform-boundaries`.

- [ ] **Step 1: Write failing positive and negative fixtures**

Positive fixtures must include:

```typescript
@Get(':id/methodology-execution-input')
findMethodologyExecutionInput() {}

@Post(':id/rules/dry-run')
prepareRuleDryRun() {}

export class MethodologyExecutionModule {}
```

Negative fixtures must include a generic `@Get(':id')` returning `{ methodology, rules }`, nested generic external-event rule helpers, and document-public presentation configuration containing methodology-labelled values.

- [ ] **Step 2: Run the test and verify the detector is absent**

```bash
rtk fnm exec --using=24.13.1 pnpm nx test scripts --runInBand
```

Expected: FAIL because the checker does not exist.

- [ ] **Step 3: Implement the narrow TypeScript-AST checker**

Walk `apps/**/api/service/src/**/*.controller.ts` and inspect literal arguments to `Controller`, `Get`, `Post`, `Put`, `Patch`, and `Delete`. Inspect top-level API feature directory names plus module filenames/class names. Reject normalized ownership concepts `methodology`, `rule-execution`, `rule-dry-run`, `audit-execution`, `audit-result`, `dry-run`, and `execution-input`; report path, line, and matched surface. Support an explicit `--repository-root <path>` CLI argument so the same detector can validate another checkout.

Do not inspect returned objects, type members, DTOs, fixtures, document-public configuration, or nested generic helper directories. Fail closed only when an inspected route decorator has a nonliteral route argument.

- [ ] **Step 4: Add the Nx and CI gates**

Add a `run-commands` target to `tools/scripts/project.json` and run `pnpm nx run scripts:check-platform-boundaries` unconditionally in the Verify workflow lint job after the existing release-workflow contract test.

- [ ] **Step 5: Run focused tests and static gates**

```bash
rtk fnm exec --using=24.13.1 pnpm nx run scripts:check-platform-boundaries
rtk fnm exec --using=24.13.1 pnpm nx test scripts --runInBand
rtk fnm exec --using=24.13.1 pnpm nx lint scripts
rtk fnm exec --using=24.13.1 pnpm nx type-check scripts
```

Expected: every command PASS on the guardrail branch.

- [ ] **Step 6: Commit exact checker paths**

```bash
rtk git add tools/scripts/src/check-platform-boundaries tools/scripts/project.json .github/workflows/verify.yaml
rtk git commit -m "ci(architecture): reject execution-specific APIs"
```

### Task 3: Require ownership evidence in pull requests

**Files:**
- Modify: `.github/pull_request_template.md`

**Interfaces:**
- Produces: review prompts for concept ownership, existing API premise evidence, and repository-scope expansion.

- [ ] **Step 1: Add concise architecture questions**

Under review considerations, require an endpoint/cross-service PR to name the concept owner, state which existing consumer API was exercised end to end, distinguish raw persistence from composed service output, and explain any added repository/service scope. Link the canonical platform-boundary document instead of copying it.

- [ ] **Step 2: Verify the template remains actionable**

```bash
rtk git diff --check -- .github/pull_request_template.md
```

Expected: PASS with no empty duplicate section.

- [ ] **Step 3: Commit the template**

```bash
rtk git add .github/pull_request_template.md
rtk git commit -m "docs(pr): require platform ownership evidence"
```

### Task 4: Prove the detector catches the motivating defect

**Files:**
- Verify only: all Task 1-3 files and the closed-PR worktree

**Interfaces:**
- Produces: positive defect evidence, known-good silence, complete local review, and repository gates.

- [ ] **Step 1: Run complete local review**

Invoke `review-code` for the complete branch. Verify every finding against current code, search the concept repository-wide, and fix shared causes rather than individual samples.

- [ ] **Step 2: Run the detector on current code**

```bash
rtk fnm exec --using=24.13.1 pnpm nx run scripts:check-platform-boundaries
```

Expected: PASS.

- [ ] **Step 3: Run the same checker against the closed-PR worktree**

Use the checker's explicit `--repository-root` option against `$CLOSED_ENDPOINT_WORKTREE`.

Expected: FAIL and identify the `:id/methodology-execution-input` route. This is the required detector red proof; do not modify the closed branch to manufacture it.

- [ ] **Step 4: Run complete applicable gates**

```bash
rtk fnm exec --using=24.13.1 pnpm nx test scripts --runInBand
rtk fnm exec --using=24.13.1 pnpm nx lint scripts
rtk fnm exec --using=24.13.1 pnpm nx type-check scripts
rtk fnm exec --using=24.13.1 pnpm nx run scripts:check-platform-boundaries
rtk fnm exec --using=24.13.1 pnpm format:check
rtk git diff --check origin/main...HEAD
```

Expected: PASS on the branch, with the explicit closed-PR negative proof recorded separately.

- [ ] **Step 5: Open the PR and converge**

Use the repository PR template. Invoke `address-pr-feedback`, reply to every thread after fixes are pushed, monitor exact-head CI, run the 20-minute quiet window, verify a clean merge tree, and stop at “ready, awaiting human merge.” Never merge or deploy.
