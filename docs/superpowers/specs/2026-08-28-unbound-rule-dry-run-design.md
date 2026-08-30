# Unbound Rule Dry-Run Design

Status: Written review pending

## Purpose

`run-rule dry-run` executes one local MassID rule processor before that rule is registered in a Smaug methodology. Smaug prepares a temporary execution graph from its document snapshots, and Methodology Rules executes the selected processor against that graph.

Palantir is a content-agnostic document and event platform. It exposes no methodology-specific route, projection, schema, or authorization behavior for this flow. Methodology selection, rule input interpretation, synthetic audit construction, and execution staging belong to Smaug and Methodology Rules.

## Goals

- Execute one explicit local MassID processor without a Smaug methodology-rule record.
- Use Smaug's latest available document snapshot as the sole source of execution documents.
- Pin one snapshot cutoff for the target and every traversed document.
- Stage every parent and related document required by the processor's declarative query criteria.
- Keep registered-rule and `--all-rules` dry runs compatible.
- Use the deployed Smaug API invocation role and SigV4 authentication.
- Keep credentials and source documents out of API and CLI logs.
- Expire staged objects through the methodology-executions bucket lifecycle.

## Non-goals

- Adding or changing a Palantir API.
- Falling back to Palantir when a Smaug snapshot is absent or invalid.
- Registering, deploying, or enabling the local rule.
- Posting a local rule result to Smaug.
- Running local processor code inside Smaug.
- Reading Palantir or Smaug MongoDB from the CLI.
- Accepting executable preprocessing logic from the caller.
- Supporting rule scopes other than MassID in this release.
- Supporting processors whose construction requires application-specific arguments.

## Ownership Boundary

Palantir owns documents, events, document authorization, and delivery of document snapshots to Smaug.

Smaug owns its persisted snapshots, methodology and rule configuration, interpretation of rule input criteria, snapshot selection, synthetic audit construction, execution staging, cleanup, and the signed preparation endpoint.

Methodology Rules owns rule definitions, declarative document-query criteria, explicit local processor selection, construction of the existing `RuleInput` envelope, local processor execution, and result presentation.

Rule processors receive `RuleInput`, then load staged documents through the existing document loader. They do not call Palantir or Smaug's document API.

## Decision

Smaug exposes a separate local-rule preparation endpoint:

```text
POST /methodologies/dry-run/prepare-local-rule
```

The endpoint accepts the selected rule's declarative input criteria. It reads the target and related documents exclusively through Smaug's `DocumentApiService`, prepares one isolated S3 execution prefix, and returns the identifiers required by the local processor.

The registered preparation endpoint owns methodology-bound and `--all-rules` execution. Its external contract does not change.

### Rejected alternatives

- A methodology-specific Palantir endpoint violates Palantir's content-agnostic boundary and combines ordinary document-read permission with raw-PII export behavior.
- A generic Palantir full-document endpoint adds a network and authorization surface that this flow does not need.
- A Palantir fallback makes equivalent dry-run requests depend on different sources and snapshot times.

## Request and Response

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

`dataSetName` is a consistency assertion, not a Palantir routing instruction. Smaug rejects a target snapshot whose stored dataset differs from the request. `ruleSlug` identifies logs and preparation context; it does not resolve a Smaug rule record. The response contains identifiers only.

`input` uses the declarative BOLD document-query shape:

```typescript
interface DocumentQueryCriteria {
  parentDocument?: RelatedDocumentCriteria;
  relatedDocuments?: RelatedDocumentCriteria[];
}

interface RelatedDocumentCriteria extends DocumentQueryCriteria {
  category?: string;
  omit?: boolean;
  subtype?: string;
  type?: string;
}
```

Smaug rejects unsupported fields, malformed values, more than six nested criteria levels, more than 20 entries in one `relatedDocuments` array, more than 250 unique documents, or more than 25 seconds of preparation time. Shared constants define these limits for validation, traversal, and tests.

`omit` affects the processor's iterator result. Smaug still collects and stages an omitted document and its requested descendants.

## Canonical Rule Definition Input

`BaseRuleDefinition<TInput = never>` has an optional `input` property typed as `TInput`. BOLD rule definitions that query related documents use `BaseRuleDefinition<DocumentQueryCriteria>`.

A related-document rule exports one criteria constant and uses it in both `ruleDefinition.input` for preparation and `DocumentQueryService.load({ criteria })` for execution. Root-only processors omit `input`; Smaug always stages the target and synthetic audit.

Explicit local mode accepts MassID processors with zero declared constructor arguments and complete static query criteria. Parameterized processors, including the no-conflicting-certificate-or-credit processor, are rejected. A separate factory or execution-descriptor design is required before those processors can run unbound.

## Snapshot Consistency

Smaug calls `DocumentApiService.findOneLatestSnapshot({ documentId })` once for the target. That snapshot supplies the opaque document, stored dataset, snapshot identifier, version date, and cutoff for every related-document lookup.

Smaug validates the stored document against `PalantirFullDocumentSchema` at its internal document-to-methodology boundary. The schema name describes the ingested shape; it creates no Palantir runtime dependency.

Every related-document fetch uses `DocumentApiService.findOneLatestSnapshot({ documentId, versionDate: cutoff })`. The request-local fetcher returns the pinned target and synthetic audit without refetching them. A document update arriving after target selection cannot enter the execution graph.

An unvalidated document is eligible when its snapshot exists in Smaug. Snapshot persistence precedes methodology matching and validation, so validation state is not an availability condition.

## Smaug Preparation Flow

1. Validate the request, dataset, document identifier, rule slug, scope, and query bounds.
2. Read the target's latest Smaug snapshot and establish its version date as the cutoff.
3. Validate the target and verify its stored dataset matches the request.
4. Create an in-memory synthetic audit by cloning the complete target, replacing its identifier, setting its parent to the target, retaining only ACTOR events, and applying the dry-run audit subtype and type.
5. Validate the synthetic audit against the same document schema.
6. Build a request-local `DocumentQueryService` whose fetcher returns the pinned audit and target and reads every other document from Smaug at or before the cutoff.
7. Traverse the requested graph, fail on missing required connections, and deduplicate by document identifier.
8. Validate every execution-workflow document before the first S3 write.
9. Stage all documents under `<executionId>/documents/`, tagged `dry-run=true`.
10. If a write fails, delete every object written by this request and return an error.
11. Return the preparation identifiers only after all writes succeed.

A single 25-second deadline covers snapshot reads, traversal, validation, and staging. Preparation creates a fresh execution on every call because local processor code and criteria can change independently of snapshots. The bucket lifecycle expires dry-run objects after seven days and noncurrent versions after one day.

## CLI Flow

```text
pnpm run-rule dry-run <processor-path> \
  --document-id <document-id> \
  --data-set-name TEST
```

The CLI loads the processor and colocated rule definition, rejects unsupported construction contracts, sends the document ID, expected dataset, MassID scope, rule slug, and optional criteria to Smaug, constructs one existing `RuleInput`, executes the processor exactly once, and prints the result locally.

`--methodology-slug`, `--rules-scope`, `--rule-slug`, and `--all-rules` are invalid in explicit local mode. Batch mode loads the module once and creates one processor instance per document. Registered modes use the registered endpoint and its returned rules array.

## Authentication

`aws-vault exec smaug-prod` supplies the base SSO credentials. The CLI assumes the deployed API Gateway invocation role and signs the Smaug request with SigV4.

The shared AWS HTTP credential provider serves rule-result reporting and dry-run preparation. `SMAUG_API_GATEWAY_ASSUME_ROLE_ARN` identifies the deployed role. The CLI loads `--env-file` before importing modules that read environment variables, while explicit shell variables retain precedence.

The endpoint uses the IAM-protected API Gateway proxy. It introduces no Palantir credential, permission, SDK call, or network dependency.

## Safety and Privacy

- The endpoint accepts declarative criteria only.
- Query depth, fan-out, document count, and preparation time have explicit limits.
- Missing, malformed, or dataset-mismatched snapshots fail closed without a Palantir fallback.
- Logs contain document identifiers, expected dataset, rule slug, counts, timings, and error codes only.
- Logs exclude source documents, participant data, credentials, authorization headers, signed headers, and full HTTP request objects.
- Raw participant data stays inside Smaug's snapshot and execution boundaries.
- The CLI persists no fetched document locally.
- The endpoint returns no source document content.
- S3 objects use the existing `dry-run=true` lifecycle boundary.

## Error Contract

Preparation fails without a success response when the request is invalid, the target snapshot is unavailable, the stored dataset differs, a document fails schema validation, a required relationship is unavailable at the cutoff, a graph limit or deadline is exceeded, or staging or cleanup fails.

The CLI never executes the processor after preparation failure. Explicit local single-document mode exits nonzero on preparation or processor failure. Batch mode records each document failure and exits nonzero after the batch. Registered mode retains its result-conversion behavior.

## Verification

### Methodology Rules

- Load an explicit processor and its rule definition.
- Reject application-specific constructor arguments.
- Forward nested criteria and omit `input` for root-only rules.
- Execute the selected processor exactly once.
- Reject mixed registered and explicit-local flags.
- Preserve registered, `--all-rules`, single-document, and batch behavior.
- Redact authorization and AWS signing headers from HTTP failures.
- Reuse the shared assume-role credential provider.

### Smaug

- Prepare from an unvalidated snapshot already stored in Smaug.
- Reject a missing target or dataset mismatch before staging.
- Use the target version date for every related-document lookup.
- Prove a later snapshot cannot enter the pinned graph.
- Return the pinned target instead of refetching it during traversal.
- Clone the complete target before applying synthetic-audit overrides.
- Traverse root-only, parent, related, omitted, and nested criteria.
- Fail on missing required connections and graph limits without writing.
- Validate and deduplicate the complete graph before staging.
- Delete successful writes after a later write fails.
- Prove the flow has no Palantir SDK or module dependency.
- Preserve registered dry-run behavior.
- Verify the IAM-protected proxy and invocation-role policy.

### End-to-end evidence

The implementation is complete only after tests demonstrate a successful unvalidated-snapshot preparation, missing-snapshot failure without a Palantir call, cutoff exclusion of a later related snapshot, required-relationship failure at the cutoff, cleanup after partial staging, and a successful registered dry run.

After deployment, an operator runs a root-only unbound processor against a real TEST MassID snapshot, a processor that traverses a related snapshot, a registered dry run, a known-invalid case, an accepted SigV4 request using the deployed invocation role, and a rejected control request using the base SSO role.

Production identifiers and participant data stay outside committed tests, fixtures, logs, and documentation.

## Delivery Boundaries

The implementation requires coordinated changes in Smaug and Methodology Rules only. Palantir requires no code or deployment change.

Smaug deploys before the Methodology Rules release. The production TEST-dataset run is operator-gated. Pull-request merge and deployment remain operator-controlled.

No change registers the rule under test in a methodology or posts its local result to Smaug.
