# Methodology Rules Unbound Dry-Run Validation Plan

Status: Implementation complete; exact-head convergence required

## Goal

Validate and deliver the approved unbound MassID dry-run implementation without exposing private infrastructure or changing production state.

## Invariants

- The CLI calls only Smaug.
- No Palantir SDK, Palantir network call, database read, or manual S3 staging path is added.
- Local rule results are not posted.
- Registered processor-path and `--all-rules` behavior remains compatible.
- Explicit local failures and normal `FAILED` outputs exit nonzero.
- The tracked invocation-role test value contains only fictional account metadata.
- Production verification and every mutation are operator-controlled.
- Pull-request merging is human-only.

## Step 1: Verify the Public Contract

- [ ] Confirm explicit local mode requires a processor path, document identifier, and dataset.
- [ ] Confirm mixed local and registered flags fail closed.
- [ ] Confirm local preparation uses the strict identifier-only response schema.
- [ ] Confirm local logs and errors exclude processor-controlled content, credentials, signed headers, and request objects.
- [ ] Confirm localhost preparation bypasses credential resolution and signing.

Run:

```bash
rtk pnpm nx run-many -t test ts lint -p rule-runner-cli,shared-http-request,shared-aws-http,shared-env --skip-nx-cache
```

## Step 2: Verify Credential Lifetime Behavior

- [ ] Prove sequential calls reuse unexpired credentials.
- [ ] Prove concurrent calls share one refresh.
- [ ] Prove credentials refresh before expiration.
- [ ] Prove a rejected refresh is retried.
- [ ] Prove malformed role configuration fails before signing.

Run:

```bash
rtk pnpm nx test shared-aws-http --skip-nx-cache
```

## Step 3: Verify Static Input and the Shared Graph

- [ ] Confirm `PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA` has the expected unchanged shape.
- [ ] Confirm exactly five processors import it: geolocation-and-address-precision, mass-id-sorting, participant-accreditations-and-verifications-requirements, prevented-emissions, and weighing.
- [ ] Confirm the old shared name has no code, documentation, or test matches.
- [ ] Confirm ineligible processors are rejected before execution.

Run the shared IO-helper and the owning test, typecheck, and lint targets for the five processors. Run processor e2e targets where available. Do not use `nx affected`.

## Step 4: Verify the Complete Changed Surface

Derive project owners from the current `origin/main...HEAD` file list and each nearest `project.json`. Run every supported `test`, `test-e2e`, `ts`, and `lint` target for those projects, then run:

```bash
rtk pnpm nx format:check
rtk pnpm ai:check
rtk git diff --check
```

## Step 5: Run the Public-Internals and Privacy Scan

Inspect the complete branch delta for:

- real AWS account identifiers or ARNs;
- private credential-profile names;
- concrete production topology or operator-only commands;
- third-party participant identifiers;
- production payloads or document identifiers;
- detailed operational material owned by another repository.

Only fictional placeholders and public interface descriptions may remain in tracked fixtures and documentation.

## Step 6: Validate the Localhost Boundary

Run the complete rule-runner target, which includes the localhost signing-bypass test:

```bash
rtk pnpm nx test rule-runner-cli --skip-nx-cache
```

The Ship operator then uses the private disposable-fixture procedure for the exact-head live gate. AWS credential and profile variables remain unset. Exercise:

- explicit local mode;
- registered processor-path mode;
- registered `--all-rules` mode;
- a known local `FAILED` output.

Require the expected preparation route per mode and no AWS/STS access. Explicit local mode requires the identifier-only local response and no result-post route; registered modes retain their registered rules-array response behavior. Require nonzero exit for the known local failure and remove every disposable file after the run.

## Step 7: Converge the Pull Request

- [ ] Invoke complete local review on the exact current SHA.
- [ ] Push only after the risk-classified local review and gates pass.
- [ ] Address every human and review-bot finding with an individual reply where a thread exists.
- [ ] Resolve every thread and read the state back.
- [ ] Require exact-head CI green.
- [ ] Require a clean merge-tree against freshly fetched `origin/main`.
- [ ] Require a 20-minute current-head quiet window.

Do not merge.

## Operator Step

After the coordinated service changes are deployed, an operator may perform separately authorized read-only TEST-dataset verification using operator-managed configuration. Do not commit identifiers, payloads, profiles, account metadata, or production topology. Any mutation requires separate explicit authorization.
