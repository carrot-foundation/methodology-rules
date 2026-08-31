# Unbound Rule Dry-Run Architecture RCA

Status: Corrective work in progress

## Incident

The initial unbound-rule design added a methodology-specific execution-input endpoint to Palantir even though Smaug already owned dry-run preparation and already read composed document snapshots through its document API. Palantir pull request #3602 (methodology execution input) was implemented and reviewed before the ownership error was challenged. It is closed and unmerged.

No Palantir deployment or production mutation occurred. The cost was avoidable implementation and review work across an unnecessary repository, plus a design that would have expanded access to document content through the wrong service boundary.

## Root Cause

The primary cause was a failed architecture-premise check. Work began from the assumption that an unvalidated MassID required a new Palantir read path. We did not first exercise Smaug's existing registered dry-run path or inspect how `DocumentApiService.findOneLatestSnapshot` delegates to `ApiDocumentSnapshotService`, which composes the selected base snapshot with document-part snapshots at or before its version.

The generic shape of Palantir's document API was treated as evidence that Palantir should supply methodology execution input. That inference confused the platform that transports documents with the consumer that interprets them. Parallel implementation then amplified the unverified premise instead of independently validating it.

## Why Existing Review Did Not Catch It

- Reviews evaluated correctness inside the proposed service split; they did not require proof that the split itself matched concept ownership.
- The plan named repository tasks before recording an end-to-end trace of the existing Smaug capability.
- Acceptance tests focused on the new endpoint contract and local implementation, not on demonstrating that no new Palantir capability was necessary.
- Palantir guidance described document-external as owning “business rules,” which is ambiguous about generic lifecycle rules versus methodology rules.
- Smaug lacked one canonical explanation of base snapshots, versioned document parts, and composed document API reads.
- Palantir's Cursor adapters contained copied Smaug project guidance, weakening repository-specific ownership signals.

These documentation gaps contributed to the failure. They did not cause the decision by themselves; the decisive failure was proceeding without verifying the existing consumer API and ownership boundary.

## Evidence

- Smaug already exposes a registered dry-run controller and service under its methodology module.
- That service calls `DocumentApiService.findOne`; the API service delegates through `findOneLatestSnapshot` to `ApiDocumentSnapshotService`.
- `ApiDocumentSnapshotService` composes document-part snapshots whose version is at or before the selected base snapshot version.
- [Methodology Rules pull request #417 (unbound rule dry runs)](https://github.com/carrot-foundation/methodology-rules/pull/417) calls only Smaug preparation routes at runtime and has no Palantir SDK, network, or database dependency. The reviewed local implementation head is `1e990a52` (fix rule-runner invocation); the remote PR head requires the final reviewed push.
- [Palantir pull request #3602 (methodology execution input)](https://github.com/carrot-foundation/palantir/pull/3602) is closed and unmerged at `00bd122c` (expose methodology execution input).
- [Palantir pull request #3603 (platform ownership guardrails)](https://github.com/carrot-foundation/palantir/pull/3603) is open. Its boundary detector passes the current guardrail branch and fails the closed endpoint branch at `document.controller.ts:114` with the matched `methodology` route concept.
- Smaug Phase 1 exists locally as `0cea5d5a` (prove composed snapshot cutoff reads), `b1f3a49e` (validate local dry-run requests), and `6123b857` (fetch pinned dry-run snapshots). No Smaug pull request exists yet, and the local preparation endpoint, staging, cleanup, and IAM work remain pending.

## Corrective Actions

### Feature correction

- Smaug owns unbound preparation using its composed snapshots, declarative rule criteria, pinned traversal cutoff, temporary staging, and cleanup.
- Methodology Rules owns explicit local processor loading, signed Smaug preparation, `RuleInput` construction, execution, and local result presentation.
- Palantir receives no runtime feature or deployment change.

### Prevention

- Smaug documents snapshot composition and requires cross-service work to exercise the existing consumer API end to end before adding a producer API.
- Palantir documents its content-agnostic ownership boundary and adds a narrow CI detector for methodology or rule-execution API ownership surfaces.
- Pull-request templates require concept ownership, prior-capability evidence, raw-versus-composed data distinction, and justification for every added repository.
- Methodology Rules documents that processors consume Smaug-staged documents and that its CLI does not call Palantir or either service database.
- Cross-repository scope expansion requires renewed approval after the premise check identifies the concept owner.

## Corrective Action Proof

| Action | Proof | Status |
| --- | --- | --- |
| Close the misplaced Palantir execution-input feature | Palantir pull request #3602 (methodology execution input) is closed and unmerged. The guard at `tools/scripts/src/check-platform-boundaries/check-platform-boundaries.mjs` still rejects its `apps/document/external/api/service/src/app/modules/document/controllers/document.controller.ts:114` route. | Complete |
| Prevent execution-specific Palantir API ownership | Palantir pull request #3603 (platform ownership guardrails) adds the guard and its mutation tests under `tools/scripts/src/check-platform-boundaries/`. The Nx target passes current code and fails the closed endpoint branch. | Awaiting human merge |
| Prepare and execute an explicit Methodology Rules processor through Smaug only | Methodology Rules pull request #417 (unbound rule dry runs), reviewed local head `1e990a52` (fix rule-runner invocation). Runtime boundaries are in `tools/rule-runner-cli/src/utils/smaug-client.ts`, `processor-loader.ts`, and `commands/dry-run.command.ts`; RED mutations proved static-input, endpoint-selection, credential-cache, and README detectors before green project gates and the three-mode localhost run. | Local implementation complete; PR convergence pending |
| Prepare composed, pinned snapshots in Smaug | Local Phase 1 commits `0cea5d5a` (prove composed cutoff), `b1f3a49e` (validate request), and `6123b857` (fetch pinned snapshots) cover `libs/shared/nest/document/api/src/__tests__/document.api.service.e2e.spec.ts`, `libs/apps/api/service/methodology/module/src/dry-run/methodology.dry-run.schema.ts`, and `libs/apps/api/service/methodology/module/src/dry-run/methodology.local-dry-run.fetcher.ts` with focused tests. | `PENDING_SMAUG_PR`: endpoint, exact-version staging cleanup, `DeleteObjectVersion` IAM, full review, and PR remain |
| Prove deployed production TEST behavior | `docs/superpowers/plans/2026-08-28-unbound-rule-dry-run-methodology-rules.md` records the operator matrix: a confirmed-absent generated document ID, root-only and related-snapshot processors, registered flow, known-invalid result, and rejected base-role control. | `PENDING_OPERATOR`: each real-document call and production mutation requires separate authorization |

## Completion Criteria

- Palantir pull request #3602 (methodology execution input) remains closed and unmerged.
- Smaug and Methodology Rules changes pass focused, full-project, architecture, privacy, and exact-head CI gates after their respective PRs exist.
- The Palantir detector passes on current code and fails on the closed endpoint branch.
- Local live tests prove composed snapshot preparation and both registered and explicit-local CLI behavior.
- Post-deployment production TEST-dataset acceptance remains a separately authorized operator action.
