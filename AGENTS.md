# Carrot Methodology Rules

Carrot Engineering maintains this public Nx workspace. Its TypeScript rule processors evaluate
methodology documents, including MassIDs, and report verification results to Smaug. Treat source
code as public and production documents, attachments and credentials as confidential.

## Workspace

- `libs/methodologies/bold/rule-processors/` contains the evaluation logic. Each processor is an
  Nx library. Keep reusable logic in `libs/shared/` and keep processors independent of each other.
- `apps/methodologies/bold-carbon/` and `apps/methodologies/bold-recycling/` contain deployable Nx
  applications. Their Lambda entry points expose handlers from the BOLD libraries using workspace
  aliases. The methodology registries live in `libs/methodologies/bold-{carbon,recycling}/rules/`.
- Cross-project imports use `@carrot-fndn/*` aliases declared in `tsconfig.paths.json`, which
  `tsconfig.base.json` extends. Keep `project.json` tags consistent with sibling projects so the
  dependency constraints in `eslint.config.js` apply. Shared libraries depend on shared code.
- Use `massID`, `gasID` and `recycledID` for new domain identifiers. Preserve existing wire keys
  when working with serialized documents and API contracts.

## Execution paths

A Lambda handler created with `wrapRuleIntoLambdaHandler` delegates evaluation to a rule processor.
Processors load related documents through the shared document loader and `DocumentQueryService`,
validate the rule subject, and evaluate the rule. Rule statuses include `PASSED`, `FAILED` and
`REVIEW_REQUIRED`. The shared Lambda wrapper posts the result to Smaug using Signature Version 4
(SigV4). Unbound execution resolves and stages snapshots through Smaug. Keep that path on Smaug so
it uses the same snapshot and audit boundary as registered execution.

- The shared document loader caches S3 reads within an invocation. Use `DOCUMENT_BUCKET_NAME` for
  staged documents and `DOCUMENT_ATTACHMENT_BUCKET_NAME` for attachment reads. Keep bucket access
  behind the shared services so callers retain the same caching and credentials behavior.
- Smaug requests use `SMAUG_API_GATEWAY_ASSUME_ROLE_ARN` for the cross-account role. `AUDIT_URL`
  selects the Smaug API. Local dry runs receive their environment through shell variables or
  `--env-file`. The checked-in test environment is deliberately non-routable.
- For mass, emissions and credit arithmetic, use the existing BigNumber helpers and preserve their
  per-domain rounding rules. Existing geolocation comparisons use `geolib`.
- Validate inbound documents with the appropriate Zod envelope, inbound, normalized, domain or
  rule-subject schema. Keep external shapes in their existing validation layer and derive types from
  the schemas. An expected verification failure becomes a rule result. Unexpected infrastructure
  failures must propagate so retries and dead-letter queue handling still work. Use structured pino
  logging with operation context and omit payloads and authentication material.

## Commands

Node is pinned in `.nvmrc`. Use the pnpm version in `package.json` and keep `pnpm-lock.yaml` frozen
for setup. For a new worktree, run `/bin/sh scripts/setup-worktree.sh` with those versions selected.
It installs dependencies and verifies the worktree's Husky hooks. A host can supply the optional
`WORKTREE_SETUP_HELPER` executable as documented in [README.md](README.md#installation).

| Task                                                            | Command                          |
| --------------------------------------------------------------- | -------------------------------- |
| Install dependencies                                            | `pnpm install --frozen-lockfile` |
| Lint one Nx project                                             | `pnpm lint <project>`            |
| Type-check one Nx project                                       | `pnpm ts <project>`              |
| Test one Nx project                                             | `pnpm test <project>`            |
| Run the Lambda integration tests for a project with that target | `pnpm nx run <project>:test-e2e` |
| Build one Lambda application                                    | `pnpm build-lambda <project>`    |
| Run a processor locally                                         | `pnpm run-rule <args>`           |
| Extract fields from a document                                  | `pnpm extract-document <args>`   |

The **canonical quality gate** is the [read-only check skill](.agents/skills/check/SKILL.md).
For Nx changes it runs `pnpm lint:affected`, `pnpm ts:affected` and `pnpm test:affected` against the
PR base. For repository-only tooling and documentation it checks the changed paths with the
relevant existing tools. Use `pnpm lint:affected:fix` only as an explicit editing step. Git hooks
run lint-staged on commit and validate the commit message.

## Pull requests and release

- Target `main`. Use [.github/pull_request_template.md](.github/pull_request_template.md) and the
  matching repository label, such as `feature`, `bug`, `documentation`, `chore` or `refactoring`.
  When a commit needs a workspace scope, the local convention uses `nx`, `rule`, `shared` and
  `script`.
- [Check and Deploy](.github/workflows/check-and-deploy.yaml) runs on branch pushes. It invokes
  [Backend Check](.github/workflows/backend-check.yaml) for Nx lint, type checks, tests, Lambda
  build and end-to-end checks, and runs the repository agent-config audit. Verify the checks
  against the proposed commit before merge.
- On `main`, Check and Deploy can invoke [Deploy](.github/workflows/deploy.yaml) when Lambda
  applications are affected. Deploy uploads artifacts to S3 for production and development. Elrond
  owns the infrastructure that consumes those artifacts. Coordinate changes to the handler or
  environment contract with that infrastructure.
- [Version and Sync Rules to Docs](.github/workflows/version-and-sync.yaml) bumps versions and
  dispatches manifest updates to Docs and Smaug on pushes to `main`. Generated inputs and outputs
  are listed in the [registry skill](.agents/skills/methodology-registry/SKILL.md).

## Where to find implementation guidance

| Change                                                                            | Reference                                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Add or update a processor, finding, Lambda entry point or methodology application | [Processor development](.agents/skills/create-rule/SKILL.md)      |
| Edit a methodology rule registry, version, manifest or generated README           | [Rule registry](.agents/skills/methodology-registry/SKILL.md)     |
| Add a document layout or change confidence, blank fields or OCR merging           | [Document extraction](.agents/skills/document-extractor/SKILL.md) |
| Review a Lambda trust boundary, signed request or document data handling          | [Lambda security review](.agents/skills/lambda-review/SKILL.md)   |
| Update the MassID example published by Docs                                       | [MassID event data](README.md#massid-event-data)                  |

`AGENTS.md` holds repository instructions. `CLAUDE.md` imports it, and Claude's skill symlinks
point to the authored directories under `.agents/skills/`. Cursor reads those same sources.

## Review guidelines

- Review finding codes, result payloads and methodology registry entries as consumer contracts.
  Changes to the result path should preserve the rule slug and existing finding identifiers
  unless the task explicitly changes those contracts.
- Prefer the stubs in `@carrot-fndn/shared/testing` and
  `@carrot-fndn/shared/methodologies/bold/testing` for Vitest suites. Keep fixtures synthetic,
  including tax identifiers, registration plates, addresses and text extracted from documents.
- Propose comments where they explain an external constraint or a non-obvious invariant. Preserve
  comments that capture a reason the code cannot express by itself.
