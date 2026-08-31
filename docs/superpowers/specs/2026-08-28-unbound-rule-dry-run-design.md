# Unbound Rule Dry-Run Design

Status: Approved

## Purpose

`run-rule dry-run` executes one explicit local MassID processor before that rule is registered in a methodology. Smaug prepares the processor input, and Methodology Rules executes the selected processor locally.

## Public Runtime Boundary

- The CLI calls Smaug only.
- The CLI does not call Palantir, read a database, or stage documents manually.
- Smaug owns snapshot selection, bounded graph preparation, temporary staging, and cleanup.
- Methodology Rules owns rule definitions, declarative query criteria, processor selection, local execution, and result presentation.
- Local execution does not post its rule result.
- Registered processor-path and `--all-rules` dry runs retain their existing behavior.

## Preparation Contract

Explicit local mode sends a strict request to `POST /methodologies/dry-run/prepare-local-rule`:

```typescript
interface LocalRuleDryRunPrepareRequest {
  dataSetName: 'PROD' | 'PROD_SIMULATION' | 'TEST';
  documentId: string;
  input?: DocumentQueryCriteria;
  rulesScope: 'MassID';
  ruleSlug: string;
}

interface LocalRuleDryRunPrepareResponse {
  auditDocumentId: string;
  auditedDocumentId: string;
  executionId: string;
}
```

The response contains identifiers only. Smaug validates the dataset and declarative criteria, pins one snapshot boundary for the prepared graph, bounds criteria before recursive parsing, and owns failure cleanup. Cleanup targets only the exact staged object versions created by that request; the required cloud permissions remain operator-managed infrastructure configuration.

## Declarative Rule Input

`BaseRuleDefinition<TInput = never>` has an optional `input` property typed as `TInput`. Eligible BOLD definitions declare their complete static `DocumentQueryCriteria`; a root-only rule declares the shared empty `BOLD_ROOT_DOCUMENT_CRITERIA`.

The five processors that load the participant-accreditation graph share `PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA` without changing its shape:

- geolocation-and-address-precision
- mass-id-sorting
- participant-accreditations-and-verifications-requirements
- prevented-emissions
- weighing

The first four definitions declare that shared input. Weighing remains ineligible because its complete input includes an unstaged attachment path. A processor with required constructor arguments, missing static input, or an additional live read outside the prepared graph is ineligible.

## CLI Selection

```text
pnpm run-rule dry-run <processor-path> \
  --document-id <document-id> \
  --data-set-name TEST
```

A processor path plus `--data-set-name` selects explicit local mode. A processor path plus `--methodology-slug` selects registered mode. `--all-rules` remains registered mode.

Explicit local mode rejects `--methodology-slug`, `--rules-scope`, `--rule-slug`, `--all-rules`, and `--config`. Registered mode rejects `--data-set-name`. Batch mode loads the local module once and creates one processor instance per document.

## Authentication and Credential Lifetime

The operator supplies credentials and the Smaug invocation-role ARN through runtime configuration. The tracked invocation-role test value uses fictional account metadata.

The shared credential provider validates the configured ARN lazily, caches assumed credentials by role ARN, coalesces concurrent refreshes, reuses unexpired credentials, refreshes before expiration, and retries after a rejected refresh. Localhost fixtures bypass signing without requiring AWS configuration.

## Safety and Privacy

- Requests accept declarative criteria only.
- Missing, malformed, or dataset-mismatched preparation input fails closed.
- This change adds no source documents, participant data, credentials, signed headers, full HTTP request objects, real account identifiers, private credential profiles, or production topology to committed fixtures and documentation.
- The CLI persists no fetched document locally.
- Preparation failures prevent processor execution.
- Explicit local single-document preparation failures, processor exceptions, and normal `FAILED` outputs exit nonzero.
- Batch mode records document failures and exits nonzero.
- Registered mode keeps its existing result-conversion behavior.

## Verification

The Methodology Rules implementation is verified by:

- loader tests for scope, constructor, static-input, and colocated-definition boundaries;
- strict request/response and error-redaction tests;
- sequential, concurrent, refresh, and retry credential-provider probes;
- local, registered processor-path, registered `--all-rules`, single-document, and batch tests;
- shared-criteria tests and owning tests for all five processors;
- a localhost live test that proves route selection and absence of AWS, Palantir, database, S3, and audit-result calls;
- exact-head local review, CI, thread convergence, and merge-tree checks.

Any deployed-environment verification is a separately authorized operator step. It remains read-only unless the operator separately authorizes a mutation. Pull-request merge and deployment remain human-controlled.
