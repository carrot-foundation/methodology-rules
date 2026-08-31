# Smaug local rule preparation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare an unbound MassID rule execution graph entirely from composed Smaug snapshots and return the identifiers required for local execution.

**Architecture:** A strict local-rule request enters the methodology module. A request-local fetcher reads composed snapshots through `DocumentApiService`, pins every lookup to the target snapshot cutoff, validates every document and dataset, then feeds the existing `DocumentQueryService`. The service validates the complete graph before sequential tagged S3 writes and removes this request's successful writes on failure or deadline expiry.

**Tech Stack:** Node.js 24.14.1, TypeScript, NestJS, Zod, MongoDB snapshot services, AWS S3, Terraform, Vitest, Nx, pnpm 10.33.0

**Spec:** `/Users/rafael/workspace/methodology-rules/docs/superpowers/specs/2026-08-28-unbound-rule-dry-run-design.md`

## Global constraints

- Use `DocumentApiService.findOneLatestSnapshot`; local dry-run code never calls or imports a Palantir SDK.
- Validate `snapshot.document` with `PalantirFullDocumentSchema` and require its `dataSetName` to match the request for every source snapshot.
- Pin all related reads to the target snapshot `versionDate` and preserve every selected source snapshot's envelope metadata.
- Support `rulesScope: 'MassID'` only, six nested criteria levels, 20 related criteria per array, and 250 staged documents including target and synthetic audit.
- Complete traversal, dataset checks, deduplication, and workflow DTO validation before the first S3 write.
- Do not start a new staging write after the 25-second cooperative deadline. Await an in-flight write, then clean up every object written by the request.
- Tag every staged object `dry-run=true`; return only `auditDocumentId`, `auditedDocumentId`, and `executionId`.
- Never log documents, participant data, credentials, signed headers, or full HTTP errors.
- Do not deploy, run Terraform apply, call production mutating APIs, or perform a successful production dry run. Those steps remain operator-gated.

---

### Task 1: Prove the composed snapshot read boundary

**Files:**
- Test: `libs/apps/api/service/document/module/src/__tests__/document.module.e2e.spec.ts`
- Test: `libs/shared/nest/document/api/src/__tests__/document.api.service.spec.ts`

**Interfaces:**
- Consumes: base `document-snapshot` plus historical `document-part-snapshot` records.
- Produces: regression evidence that `DocumentApiService.findOneLatestSnapshot({ documentId, versionDate })` returns the latest eligible snapshot with composed parts.

- [ ] **Step 1: Add a failing cutoff composition case**

Create a document whose base snapshot omits `externalEvents`, store an earlier event part and a later event part, then request a cutoff between them. Assert the returned snapshot contains only the earlier composed events and preserves the selected snapshot's `id`, `deduplicationId`, `createdAt`, and `versionDate`.

- [ ] **Step 2: Characterize the existing composed service behavior**

Run:

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-document-module --args="src/__tests__/document.module.e2e.spec.ts"
```

Expected: PASS through `DocumentApiService`, proving the existing composed cutoff behavior before local dry-run code is added. A raw repository read is not an accepted comparison path.

- [ ] **Step 3: Use only the public Smaug document service path**

Exercise `DocumentApiService.findOneLatestSnapshot` in the test. Do not add a raw repository or Mongo read to production code.

- [ ] **Step 4: Run focused tests**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-document-module --args="src/__tests__/document.module.e2e.spec.ts"
rtk env NX_DAEMON=false pnpm nx test shared-nest-document-api
```

Expected: PASS, including cutoff exclusion and composed parts.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/apps/api/service/document/module/src/__tests__/document.module.e2e.spec.ts libs/shared/nest/document/api/src/__tests__/document.api.service.spec.ts
rtk git commit -m "test(document): prove composed snapshot cutoff reads"
```

### Task 2: Define the bounded local preparation contract

**Files:**
- Modify: `libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.schema.ts`
- Create: `libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.constants.ts`
- Test: `libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.dry-run.schema.spec.ts`

**Interfaces:**
- Produces: `LocalRuleDryRunPrepareBodySchema`, `LocalRuleDryRunPrepareBody`, `LocalRuleDryRunPrepareResponse`, `LOCAL_DRY_RUN_MAX_DEPTH = 6`, `LOCAL_DRY_RUN_MAX_RELATED = 20`, `LOCAL_DRY_RUN_MAX_DOCUMENTS = 250`, and `LOCAL_DRY_RUN_TIMEOUT_MS = 25_000`.

- [ ] **Step 1: Write failing boundary cases**

Cover the three accepted datasets, MassID-only scope, strict unknown-field rejection, malformed identifiers/slugs, six accepted nested levels, seven rejected levels, 20 accepted related criteria, 21 rejected criteria, and `omit` acceptance only on related criteria.

- [ ] **Step 2: Run the focused schema test**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.dry-run.schema.spec.ts"
```

Expected: FAIL before the local schema exists.

- [ ] **Step 3: Implement a strict recursive Zod schema**

```typescript
const RelatedDocumentCriteriaSchema: z.ZodType<RelatedDocumentCriteria> = z.lazy(() =>
  z.strictObject({
    category: NonEmptyStringSchema.optional(),
    omit: z.boolean().optional(),
    parentDocument: RelatedDocumentCriteriaSchema.optional(),
    relatedDocuments: z.array(RelatedDocumentCriteriaSchema).max(LOCAL_DRY_RUN_MAX_RELATED).optional(),
    subtype: NonEmptyStringSchema.optional(),
    type: NonEmptyStringSchema.optional(),
  }),
);
```

Keep the registered `DryRunPrepareBodySchema` unchanged.

- [ ] **Step 4: Run focused tests and lint**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.dry-run.schema.spec.ts"
rtk env NX_DAEMON=false pnpm nx lint apps-api-service-methodology-module
```

Expected: PASS.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.schema.ts libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.constants.ts libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.dry-run.schema.spec.ts
rtk git commit -m "feat(methodology): validate local dry-run requests"
```

### Task 3: Fetch pinned Smaug snapshots for traversal

**Files:**
- Create: `libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.fetcher.ts`
- Test: `libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.local-dry-run.fetcher.spec.ts`

**Interfaces:**
- Consumes: `DocumentApiService`, target snapshot, synthetic audit, request dataset, cutoff, deadline, and staged-document limit.
- Produces: a `DocumentFetcher<MethodologyExecutionWorkflowDocument<PalantirFullDocument>, MethodologyExecutionWorkflowDocumentKey>` for `DocumentQueryService`.

- [ ] **Step 1: Write failing fetcher tests**

Cover cached audit/target reads, `{ documentId, versionDate: cutoff }` for every other read, composed document validation, all-source dataset mismatch, source metadata preservation, deduplicated fetches, staged-document limit including audit, and a late read rejected before staging.

- [ ] **Step 2: Run the focused test**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.local-dry-run.fetcher.spec.ts"
```

Expected: FAIL because the fetcher is absent.

- [ ] **Step 3: Implement snapshot validation and mapping**

```typescript
const toWorkflowDocument = (
  snapshot: ApiDocumentSnapshotEntity,
  expectedDataSetName: DataSetName,
): MethodologyExecutionWorkflowDocument<PalantirFullDocument> => {
  const document = PalantirFullDocumentSchema.parse(snapshot.document);
  if (document.dataSetName !== expectedDataSetName) throw new LocalDryRunDataSetMismatchError();
  return { ...snapshot, document, documentId: snapshot.documentId };
};
```

Use `findOneLatestSnapshot({ documentId, versionDate: cutoff })`; do not generate replacement metadata for source snapshots. Strip only `omit` while adapting criteria so omitted nodes and descendants are still fetched and staged.

- [ ] **Step 4: Run focused tests and dependency grep**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.local-dry-run.fetcher.spec.ts"
rtk rg -n "NestPalantirSdk|palantirSdk|getMethodologyExecutionInput" libs/apps/api/service/methodology/module/src/dry-run
```

Expected: tests PASS and grep returns no local-dry-run matches.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.fetcher.ts libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.local-dry-run.fetcher.spec.ts
rtk git commit -m "feat(methodology): fetch pinned dry-run snapshots"
```

### Task 4: Stage atomically with cooperative deadline cleanup

**Files:**
- Create: `libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.service.ts`
- Test: `libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.local-dry-run.service.spec.ts`
- Modify: `libs/apps/api/service/methodology/module/src/execution-workflow/methodology.execution-workflow.service.ts`
- Test: `libs/apps/api/service/methodology/module/src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts`

**Interfaces:**
- Consumes: Task 3 fetcher and existing `DocumentQueryService`/workflow repository.
- Produces: `LocalDryRunService.prepare(dto)` plus `MethodologyExecutionWorkflowService.deleteDocument({ documentId, executionId })`.

- [ ] **Step 1: Write failing service and cleanup tests**

Cover root-only and nested graphs, an existing target snapshot with no methodology-validation state, ACTOR-only cloned audit, missing connections, deduplication, complete validation before writes, source metadata preservation, sequential tagged writes, second-write failure cleanup, cleanup failure propagation, expiry before writes, expiry while one write is in flight, and no success response after expiry. The unvalidated-snapshot case must succeed through the real local service boundary.

- [ ] **Step 2: Run focused tests**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.local-dry-run.service.spec.ts src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts"
```

Expected: FAIL because local preparation and workflow deletion are absent.

- [ ] **Step 3: Implement the request-local flow**

Read and validate the target before generating an execution ID. Establish `cutoff = target.versionDate`, clone the complete validated target for the synthetic audit, create `DocumentQueryService(fetcher, fetcher, getDocumentKey, MissingConnectionBehavior.ERROR)`, and validate the complete deduplicated DTO array before staging.

Before and after every awaited read/write, call a request-local deadline assertion. Write sequentially, record each successful document key, and on any error await the current write and call `deleteDocument` for every recorded document before rejecting. Preserve the original failure as `cause`; aggregate cleanup failures without returning success.

- [ ] **Step 4: Run focused tests**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.local-dry-run.service.spec.ts src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts"
rtk env NX_DAEMON=false pnpm nx lint apps-api-service-methodology-module
```

Expected: PASS.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/apps/api/service/methodology/module/src/dry-run libs/apps/api/service/methodology/module/src/execution-workflow/methodology.execution-workflow.service.ts libs/apps/api/service/methodology/module/src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts
rtk git commit -m "feat(methodology): stage local dry-run graphs"
```

### Task 5: Expose the IAM-protected endpoint and cleanup permission

**Files:**
- Modify: `libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.controller.ts`
- Test: `libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.dry-run.controller.spec.ts`
- Modify: `libs/apps/api/service/methodology/module/src/methodology.module.ts`
- Test: `libs/apps/api/service/methodology/module/src/__tests__/methodology.module.e2e.spec.ts`
- Modify: `apps/api/infra/aws-ecs/src/main.tf`

**Interfaces:**
- Produces: `POST /methodologies/dry-run/prepare-local-rule` and `s3:DeleteObject` for objects in the methodology-executions bucket.

- [ ] **Step 1: Write failing controller/module tests**

Assert the route uses `LocalRuleDryRunPrepareBodySchema`, returns the identifier-only response, and the production methodology module resolves `LocalDryRunService` with `DOCUMENT_API_SERVICE` without importing `NestPalantirSdkModule` for this flow.

- [ ] **Step 2: Run controller tests**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.dry-run.controller.spec.ts"
```

Expected: FAIL before the route/provider exists.

- [ ] **Step 3: Implement route, provider, and least-available IAM scope**

Add `@Post('prepare-local-rule')` alongside the registered route. Register `LocalDryRunService`; reuse the already imported `DocumentApiModule`.

Add `s3:DeleteObject` only to the API task-role statement whose resource is `${module.s3_methodology_executions.bucket_arn}/*`. Do not claim tag-scoped deletion: AWS S3 does not expose `s3:ExistingObjectTag` as a condition key for `DeleteObject`. Keep cleanup calls inside `LocalDryRunService` and retain the existing lifecycle fallback.

- [ ] **Step 4: Run application and Terraform checks**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.dry-run.controller.spec.ts src/__tests__/methodology.module.e2e.spec.ts"
rtk pnpm verify:plan
rtk pnpm verify:fast
```

Expected: focused tests PASS and the bounded verifier includes the changed Terraform static lanes.

Generate a non-applying Terraform plan through the repository's approved plan workflow and inspect its JSON. Assert `s3:DeleteObject` is added to the API task role only and the statement resource is exactly the methodology-executions bucket object ARN. If credentials or remote state make that readback unavailable, record it as `PENDING_OPERATOR`; static validation is not a substitute for the semantic policy readback.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.controller.ts libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.dry-run.controller.spec.ts libs/apps/api/service/methodology/module/src/methodology.module.ts libs/apps/api/service/methodology/module/src/__tests__/methodology.module.e2e.spec.ts apps/api/infra/aws-ecs/src/main.tf
rtk git commit -m "feat(methodology): expose local dry-run preparation"
```

### Task 6: Add durable Smaug architecture guardrails

**Files:**
- Create: `docs/architecture/document-snapshots.md`
- Modify: `docs/architecture/README.md`
- Modify: `.ai/PROJECT_CONTEXT.md`
- Modify: `.ai/capabilities/skills/task-exec.md`
- Modify: `.github/pull_request_template.md`
- Regenerate: files produced by `pnpm ai:sync`

**Interfaces:**
- Produces: one canonical explanation of base snapshots, document parts, composition, cutoff semantics, service ownership, and cross-service premise checks.

- [ ] **Step 1: Add the current-state architecture document**

State that `document-snapshot.document` is the base, `document-part-snapshot` holds versioned parts, `ApiDocumentSnapshotService` composes parts at or before the selected snapshot version, and consumers establish availability through `DocumentApiService`, never raw Mongo fields.

- [ ] **Step 2: Correct canonical project and execution guidance**

In `.ai/PROJECT_CONTEXT.md`, state that Palantir adapters ingest content-agnostic documents/events while Smaug's methodology domain owns interpretation. In `task-exec`, require cross-service work to name the concept owner, exercise the existing consumer API end to end, distinguish persistence from composed output, and seek re-approval when another repository enters scope. Add the ownership questions to the PR template without duplicating the architecture text.

- [ ] **Step 3: Regenerate adapters and verify parity**

```bash
rtk pnpm ai:sync
rtk pnpm ai:check
rtk pnpm verify:plan
rtk pnpm verify:fast
```

Expected: every command PASS; generated adapters contain the canonical boundary and no history narration.

- [ ] **Step 4: Scan and commit exact paths**

Inspect the staged diff for real third-party identifiers, then commit only the canonical, generated, architecture, and template paths:

```bash
rtk git commit -m "docs(architecture): define document snapshot ownership"
```

### Task 7: Complete local convergence and stop before deployment

**Files:**
- Verify only: all files changed in Tasks 1-6

**Interfaces:**
- Produces: reviewed, locally validated Smaug branch with deployment evidence explicitly pending.

- [ ] **Step 1: Run complete branch review**

Invoke `review-code` against the complete branch. Treat every finding as untrusted, search the concept repository-wide, fix the shared cause where duplicated, and repeat scoped review after every correction.

- [ ] **Step 2: Run repository-owned gates**

```bash
rtk pnpm verify:plan
rtk pnpm verify:fast
rtk git diff --check origin/main...HEAD
```

Run any additional focused owning-project tests selected by `verify:plan`. Do not substitute guessed raw commands for repository targets.

- [ ] **Step 3: Run the local HTTP live test**

Exercise the real local Nest/Fastify `POST /methodologies/dry-run/prepare-local-rule` path with a composed base snapshot plus event parts and mocked S3. Prove the staged target/audit contain composed events, all related reads use the cutoff, and no local-dry-run Palantir SDK call exists. Record the reviewed SHA and command in the ship proof file.

- [ ] **Step 4: Stop at operator-gated boundaries**

Record `PENDING_OPERATOR: inspect the non-applying Terraform plan JSON, deploy Smaug, and run the coordinated production TEST acceptance matrix: assumed-role acceptance plus missing-snapshot rejection for a freshly generated confirmed-absent ID; root-only and related-snapshot unbound processors; a registered dry run; a known-invalid case; and base-SSO-role rejection.` Do not apply, deploy, or mutate production without separate authorization.
