# Unbound Rule Dry-Run Architecture RCA

Status: Corrective work in progress

## Incident

The initial unbound-rule design added a methodology-specific execution-input endpoint to Palantir even though Smaug already owned dry-run preparation and already read composed document snapshots through its document API. Palantir pull request #3602 (methodology execution input) was implemented and reviewed before the ownership error was challenged. It is closed and unmerged.

No Palantir deployment or production mutation occurred. The cost was avoidable implementation and review work across an unnecessary repository, plus a design that would have expanded access to document content through the wrong service boundary.

## Root Cause

The primary cause was a failed architecture-premise check. Work began from the assumption that an unvalidated MassID required a new Palantir read path. We did not first exercise Smaug's existing registered dry-run path or inspect how `DocumentApiService.findOneLatestSnapshot` composes base snapshots with document-part snapshots.

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
- That service reads documents through `DocumentApiService`, not through a new Palantir endpoint.
- `DocumentApiService.findOneLatestSnapshot` delegates to `ApiDocumentSnapshotService`.
- `ApiDocumentSnapshotService` composes document-part snapshots at or before the selected snapshot version.
- Methodology Rules pull request #417 (unbound rule dry runs) already calls a signed Smaug preparation endpoint and contains no Palantir runtime dependency; its remaining work is correction and complete verification.
- Palantir pull request #3602 (methodology execution input) is closed and unmerged.

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

## Completion Criteria

- Palantir pull request #3602 (methodology execution input) remains closed and unmerged.
- Smaug and Methodology Rules changes pass focused, full-project, architecture, privacy, and exact-head CI gates.
- The Palantir detector passes on current code and fails on the closed endpoint branch.
- Local live tests prove composed snapshot preparation and both registered and explicit-local CLI behavior.
- Post-deployment production TEST-dataset acceptance remains a separately authorized operator action.
