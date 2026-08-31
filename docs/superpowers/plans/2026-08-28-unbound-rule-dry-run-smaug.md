# Smaug local rule preparation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare an unbound MassID rule execution graph entirely from composed Smaug snapshots and return the identifiers required for local execution.

**Architecture:** A strict local-rule request enters the methodology module. A request-local fetcher reads composed snapshots through `DocumentApiService`, pins every lookup to the target snapshot cutoff, validates every document and dataset, then feeds the existing `DocumentQueryService`. The service validates the complete graph before sequential tagged S3 writes and removes this request's successful writes on failure or deadline expiry.

**Tech Stack:** Node.js 24.14.1, TypeScript, NestJS, Zod, MongoDB snapshot services, AWS S3, Terraform, Vitest, Nx, pnpm 10.33.0

**Spec:** `docs/superpowers/specs/2026-08-28-unbound-rule-dry-run-design.md`

## Global constraints

- Use `DocumentApiService.findOneLatestSnapshot`; local dry-run code never calls or imports a Palantir SDK.
- Validate `snapshot.document` with `PalantirFullDocumentSchema` and require its `dataSetName` to match the request for every source snapshot.
- Pin all related reads to the target snapshot `versionDate` and preserve every selected source snapshot's envelope metadata.
- Support `rulesScope: 'MassID'` only, six relationship edges, 20 related criteria per array, 250 total criteria nodes, and 250 staged documents including target and synthetic audit.
- Complete traversal, dataset checks, deduplication, and workflow DTO validation before the first S3 write.
- Do not start a new staging write after the 25-second cooperative deadline. Await an in-flight write, then clean up every object written by the request.
- Tag every staged object `dry-run=true`; return only `auditDocumentId`, `auditedDocumentId`, and `executionId`.
- Never log documents, participant data, credentials, signed headers, or full HTTP errors.
- Do not deploy, run Terraform apply, call production mutating APIs, or perform a successful production dry run. Those steps remain operator-gated.

---

### Task 1: Prove the composed snapshot read boundary

**Files:**
- Create: `libs/shared/nest/document/api/src/__tests__/document.api.service.e2e.spec.ts`
- Test: `libs/shared/nest/document/api/src/__tests__/document.api.service.spec.ts`

**Interfaces:**
- Consumes: base `document-snapshot` plus historical `document-part-snapshot` records.
- Produces: regression evidence that `DocumentApiService.findOneLatestSnapshot({ documentId, versionDate })` returns the latest eligible snapshot with composed parts.

- [ ] **Step 1: Add a cutoff composition regression case**

Create a document whose base snapshot omits `externalEvents`, store an earlier event part and a later event part, then request a cutoff between them. Assert the returned snapshot contains only the earlier composed events and preserves the selected snapshot's `id`, `deduplicationId`, `createdAt`, and `versionDate`.

- [ ] **Step 2: Characterize the existing composed service behavior**

Run:

```bash
rtk env NX_DAEMON=false pnpm nx test shared-nest-document-api --args="src/__tests__/document.api.service.e2e.spec.ts"
```

Expected: PASS through `DocumentApiService`, characterizing the existing composed cutoff behavior before local dry-run code is added. This is regression evidence rather than a red TDD step because the behavior already exists. A raw repository read is not an accepted comparison path.

- [ ] **Step 3: Use only the public Smaug document service path**

Exercise `DocumentApiService.findOneLatestSnapshot` in the test. Do not add a raw repository or Mongo read to production code.

- [ ] **Step 4: Run focused tests**

```bash
rtk env NX_DAEMON=false pnpm nx test shared-nest-document-api --args="src/__tests__/document.api.service.e2e.spec.ts"
rtk env NX_DAEMON=false pnpm nx test shared-nest-document-api
```

Expected: PASS, including cutoff exclusion and composed parts.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/shared/nest/document/api/src/__tests__/document.api.service.e2e.spec.ts libs/shared/nest/document/api/src/__tests__/document.api.service.spec.ts
rtk git commit -m "test(document): prove composed snapshot cutoff reads"
```

### Task 2: Define the bounded local preparation contract

**Files:**
- Modify: `libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.schema.ts`
- Create: `libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.constants.ts`
- Test: `libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.dry-run.schema.spec.ts`

**Interfaces:**
- Produces: `LocalRuleDryRunPrepareBodySchema`, `LocalRuleDryRunPrepareBody`, `LocalRuleDryRunPrepareResponse`, `LOCAL_DRY_RUN_MAX_DEPTH = 6`, `LOCAL_DRY_RUN_MAX_RELATED = 20`, `LOCAL_DRY_RUN_MAX_CRITERIA_NODES = 250`, `LOCAL_DRY_RUN_MAX_DOCUMENTS = 250`, and `LOCAL_DRY_RUN_TIMEOUT_MS = 25_000`.

- [ ] **Step 1: Write failing boundary cases**

Cover the three accepted datasets, MassID-only scope, strict unknown-field rejection, malformed identifiers/slugs, six accepted relationship edges, seven rejected edges, 20 accepted related criteria, 21 rejected criteria, 250 accepted total criteria nodes, 251 rejected nodes before recursive parsing, and `omit` acceptance only inside `parentDocument` or `relatedDocuments` criteria. Count the top-level `input` as one node and every nested criterion as one additional node.

- [ ] **Step 2: Run the focused schema test**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.dry-run.schema.spec.ts"
```

Expected: FAIL before the local schema exists.

- [ ] **Step 3: Implement a strict recursive Zod schema**

```typescript
const createDocumentQueryCriteriaSchema = (
  remainingDepth: number,
  related: boolean,
): z.ZodType<DocumentQueryCriteria | RelatedDocumentCriteria> => {
  const nested =
    remainingDepth === 0
      ? {}
      : {
          parentDocument: createDocumentQueryCriteriaSchema(remainingDepth - 1, true).optional(),
          relatedDocuments: z
            .array(createDocumentQueryCriteriaSchema(remainingDepth - 1, true))
            .max(LOCAL_DRY_RUN_MAX_RELATED)
            .optional(),
        };

  return z.strictObject({
    ...nested,
    ...(related && {
      category: NonEmptyStringSchema.optional(),
      omit: z.boolean().optional(),
      subtype: NonEmptyStringSchema.optional(),
      type: NonEmptyStringSchema.optional(),
    }),
  });
};

const DocumentQueryCriteriaSchema = createDocumentQueryCriteriaSchema(
  LOCAL_DRY_RUN_MAX_DEPTH,
  false,
);
```

Wrap this finite schema in a `z.unknown().superRefine(...)` node-count precheck and `.pipe(DocumentQueryCriteriaSchema)`. The precheck stops walking as soon as the 251st criteria node is found. This ordering is required because `ZodValidationPipe` completes before `LocalDryRunService` starts its cooperative deadline.

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
  const validation = PalantirFullDocumentSchema.safeParse(snapshot.document);
  if (!validation.success) {
    throw new Error('Invalid stored document for local dry-run.', {
      cause: validation.error,
    });
  }
  const document = validation.data;
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
- Modify: `libs/apps/api/service/methodology/module/src/execution-workflow/methodology.execution-workflow.repository.ts`
- Test: `libs/apps/api/service/methodology/module/src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts`
- Modify: `libs/shared/nest/s3/src/s3.schema.ts`
- Modify: `libs/shared/nest/s3/src/s3.service.ts`
- Test: `libs/shared/nest/s3/src/__tests__/s3.service.spec.ts`

**Interfaces:**
- Consumes: Task 3 fetcher and existing `DocumentQueryService`/workflow repository.
- Produces: `LocalDryRunService.prepare(dto)`, `MethodologyExecutionWorkflowRepository.writeToS3(...)` and `MethodologyExecutionWorkflowService.writeDocument(...)` returning `S3UploadOutput`, `MethodologyExecutionWorkflowService.deleteDocument({ documentId, executionId, versionId })`, and the repository deletion path to `NestS3Service.delete`.

- [ ] **Step 1: Write failing service and cleanup tests**

Cover root-only and nested graphs, an existing target snapshot with no methodology-validation state, ACTOR-only cloned audit, missing connections, deduplication, complete validation before writes, source metadata preservation, sequential tagged writes, exact-version cleanup after a later write fails, cleanup failure propagation, expiry before writes, expiry while one write is in flight, and no success response after expiry. A nested case must prove traversal calls `load({ documentId: syntheticAuditId, criteria: input, context })`: give the synthetic audit the target as parent and give the target a different parent so using the target as root fails visibly. The unvalidated-snapshot case must succeed through the real local service boundary.

- [ ] **Step 2: Run focused tests**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.local-dry-run.service.spec.ts src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts"
```

Expected: FAIL because local preparation and workflow deletion are absent.

- [ ] **Step 3: Implement the request-local flow**

Read and validate the target before generating an execution ID. Establish `cutoff = target.versionDate`, clone the complete validated target for the synthetic audit, create `DocumentQueryService(fetcher, fetcher, getDocumentKey, MissingConnectionBehavior.ERROR)`, and, when `input` exists, call `load({ context: { executionId }, criteria: inputWithoutOmit, documentId: syntheticAuditId })`. Validate the complete deduplicated DTO array before staging.

Before and after every awaited read/write, call a request-local deadline assertion. Write sequentially and record each successful document key with the `versionId` returned by S3. Treat an absent upload `versionId` as a staging invariant failure because the methodology-executions bucket has versioning enabled; retain the lifecycle policy as the fallback for that infrastructure-drift case. On any error, await the current write and call `deleteDocument` for every recorded exact version before rejecting. If every deletion succeeds, rethrow the original failure. If any deletion fails, throw an `AggregateError` whose `cause` is the original failure and whose errors contain the cleanup failures. `MethodologyExecutionWorkflowRepository` remains the single owner of `NestS3Service`; add its delete method rather than injecting S3 into the local service. Extend `S3DeleteInput` with optional `versionId` and pass it as `VersionId` to `DeleteObjectCommand`; preserve key-only deletion for existing callers.

- [ ] **Step 4: Run focused tests**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.local-dry-run.service.spec.ts src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts"
rtk env NX_DAEMON=false pnpm nx lint apps-api-service-methodology-module
rtk env NX_DAEMON=false pnpm nx test shared-nest-s3
rtk env NX_DAEMON=false pnpm nx lint shared-nest-s3
```

Expected: PASS.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.service.ts libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.local-dry-run.service.spec.ts libs/apps/api/service/methodology/module/src/execution-workflow/methodology.execution-workflow.repository.ts libs/apps/api/service/methodology/module/src/execution-workflow/methodology.execution-workflow.service.ts libs/apps/api/service/methodology/module/src/execution-workflow/__tests__/methodology.execution-workflow.service.spec.ts libs/shared/nest/s3/src/s3.schema.ts libs/shared/nest/s3/src/s3.service.ts libs/shared/nest/s3/src/__tests__/s3.service.spec.ts
rtk git commit -m "feat(methodology): stage local dry-run graphs"
```

### Task 5: Expose the IAM-protected endpoint and cleanup permission

**Files:**
- Modify: `libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.controller.ts`
- Test: `libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.dry-run.controller.spec.ts`
- Modify: `libs/apps/api/service/methodology/module/src/methodology.module.ts`
- Test: `libs/apps/api/service/methodology/module/src/__tests__/methodology.module.e2e.spec.ts`
- Create: `libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.local-dry-run.e2e.spec.ts`
- Modify: `apps/api/infra/aws-ecs/src/main.tf`
- Modify: `apps/api/infra/aws-ecs/src/locals.tf`

**Interfaces:**
- Produces: `POST /methodologies/dry-run/prepare-local-rule` plus `s3:DeleteObject` and `s3:DeleteObjectVersion` for objects in the methodology-executions bucket.

- [ ] **Step 1: Write failing controller/module tests**

Assert the route uses `LocalRuleDryRunPrepareBodySchema`, returns the identifier-only response, and the production methodology module resolves `LocalDryRunService` with `DOCUMENT_API_SERVICE` without importing `NestPalantirSdkModule` for this flow. Add a local Nest/Fastify E2E case that seeds a base snapshot plus earlier and later event parts, calls the route over HTTP with the cutoff-producing target, and captures staged documents through an overridden S3 boundary.

- [ ] **Step 2: Run controller tests**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.dry-run.controller.spec.ts"
```

Expected: FAIL before the route/provider exists.

- [ ] **Step 3: Implement route, provider, and least-available IAM scope**

Add `@Post('prepare-local-rule')` alongside the registered route. Register `LocalDryRunService`; reuse the already imported `DocumentApiModule`.

Add `local.methodology_executions_bucket_name = "${var.tfc_organization_name}-methodology-executions"`, following the existing locally derived S3-name pattern, because this workspace has no `aws-s3` remote-state dependency. Add a dedicated API task-role statement granting only `s3:DeleteObject` and `s3:DeleteObjectVersion` on `arn:aws:s3:::${local.methodology_executions_bucket_name}/*`. Do not add deletion to the existing broad S3 statement and do not claim tag-scoped deletion: AWS S3 does not expose `s3:ExistingObjectTag` as a condition key for these deletion actions. Keep cleanup calls inside `LocalDryRunService` and retain the existing lifecycle fallback for successful dry runs.

- [ ] **Step 4: Run application and Terraform checks**

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.dry-run.controller.spec.ts src/__tests__/methodology.module.e2e.spec.ts src/dry-run/__tests__/methodology.local-dry-run.e2e.spec.ts"
rtk pnpm verify:plan
rtk pnpm verify:fast
```

Expected: focused tests PASS and the bounded verifier includes the changed Terraform static lanes.

Generate a non-applying local Terraform plan through `api-infra-aws-ecs:tf --configuration plan`, writing the plan artifact to a unique temporary path outside the checkout, then inspect it with `terraform show -json`. This configuration uses local state plus read-only Terraform remote-state data sources; do not start a Terraform Cloud run. Assert `s3:DeleteObject` and `s3:DeleteObjectVersion` are added to the API task role only and the statement resource is exactly the methodology-executions bucket object ARN. If credentials or remote-state reads make that readback unavailable, record it as `PENDING_OPERATOR`; static validation is not a substitute for the semantic policy readback. Never run `apply`.

```bash
rtk mktemp -d /tmp/smaug-local-rule-dry-run.XXXXXX
rtk env NX_DAEMON=false pnpm nx run api-infra-aws-ecs:tf --configuration plan --args="-out=<printed-temporary-directory>/api-ecs.tfplan"
rtk terraform -chdir=apps/api/infra/aws-ecs/src show -json <printed-temporary-directory>/api-ecs.tfplan
```

The second and third commands use the directory printed by the first command. Save only the policy assertions in the ship proof; the plan artifact remains outside the checkout.

- [ ] **Step 5: Commit exact paths**

```bash
rtk git add libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.controller.ts libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.dry-run.controller.spec.ts libs/apps/api/service/methodology/module/src/dry-run/__tests__/methodology.local-dry-run.e2e.spec.ts libs/apps/api/service/methodology/module/src/methodology.module.ts libs/apps/api/service/methodology/module/src/__tests__/methodology.module.e2e.spec.ts apps/api/infra/aws-ecs/src/main.tf apps/api/infra/aws-ecs/src/locals.tf
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
rtk git add docs/architecture/document-snapshots.md docs/architecture/README.md .ai/PROJECT_CONTEXT.md .ai/capabilities/skills/task-exec.md .github/pull_request_template.md AGENTS.md CLAUDE.md .agents/skills/task-exec/SKILL.md .claude/skills/task-exec/SKILL.md .cursor/skills/task-exec/SKILL.md .ai/PARITY_MATRIX.md
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
rtk env NX_DAEMON=false pnpm nx test shared-nest-document-api
rtk env NX_DAEMON=false pnpm nx test shared-nest-s3
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module
rtk env NX_DAEMON=false pnpm nx lint shared-nest-document-api
rtk env NX_DAEMON=false pnpm nx lint shared-nest-s3
rtk env NX_DAEMON=false pnpm nx lint apps-api-service-methodology-module
rtk git diff --check origin/main...HEAD
```

The bounded verifier intentionally reports a partial verdict, so the explicit owning-project test and lint targets above are part of the local gate. Run any additional lane selected by `verify:plan` that `verify:fast` defers and that the changed content can violate. Do not substitute guessed raw commands for repository targets; repo-wide typecheck and build remain CI-owned unless reproducing a failure.

- [ ] **Step 3: Run the local HTTP live test**

Run:

```bash
rtk env NX_DAEMON=false pnpm nx test apps-api-service-methodology-module --args="src/dry-run/__tests__/methodology.local-dry-run.e2e.spec.ts"
```

This exercises the real local Nest/Fastify `POST /methodologies/dry-run/prepare-local-rule` path with a composed base snapshot plus event parts and mocked S3. Prove the staged target/audit contain composed events, all related reads use the cutoff, and no local-dry-run Palantir SDK call exists. Record the reviewed SHA and command in the ship proof file.

- [ ] **Step 4: Stop at operator-gated boundaries**

When the non-applying local Terraform plan cannot be inspected, record `PENDING_OPERATOR: inspect the non-applying Terraform plan JSON.` Always record `PENDING_OPERATOR: deploy Smaug and run the coordinated production TEST acceptance matrix: assumed-role acceptance plus missing-snapshot rejection for a freshly generated confirmed-absent ID; root-only and related-snapshot unbound processors; a registered dry run; a known-invalid case; and base-SSO-role rejection.` Do not apply, deploy, start a Terraform Cloud run, or mutate production without separate authorization.
