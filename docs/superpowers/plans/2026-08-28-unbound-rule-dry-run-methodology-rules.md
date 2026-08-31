# Methodology Rules Unbound Dry-Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `run-rule dry-run` execute one explicit local MassID processor against Smaug-prepared live input without requiring methodology registration.

**Architecture:** Rule definitions optionally carry the same declarative BOLD query criteria their processors consume. Explicit path mode loads the processor and definition together, calls a separate SigV4-signed Smaug preparation endpoint, and instantiates the processor once per document; registered mode keeps its current contract.

**Tech Stack:** Node.js 24.14.1, TypeScript, Commander, Zod, AWS STS and SigV4, Axios, Vitest, Nx, pnpm 10.18.3

**Spec:** `/Users/rafael/workspace/methodology-rules/docs/superpowers/specs/2026-08-28-unbound-rule-dry-run-design.md`

## Global Constraints

- Explicit local mode supports MassID processors only.
- Explicit local mode rejects processors whose construction requires application-specific arguments.
- Registered and `--all-rules` dry-runs remain behaviorally unchanged.
- Root-only definitions omit `input`; related-document definitions share one criteria constant between definition and processor.
- Explicit local mode rejects `--methodology-slug`, `--rules-scope`, `--rule-slug`, and `--all-rules`.
- Single-document processor exceptions reject and exit nonzero; batch records errors and exits nonzero.
- `aws-vault exec smaug-prod` provides base credentials; requests use assumed-role SigV4 credentials.
- Shell environment variables override `--env-file`; configuration loads before modules that read it.
- Never persist fetched documents or log documents, credentials, signed headers, or full Axios request objects.
- The CLI calls only Smaug's signed preparation API; it never calls Palantir or reads either service's database.
- Production TEST-dataset end-to-end execution is an operator-gated task.

---

### Task 1: Add Typed Rule-Definition Input and Share Every Supported BOLD Criteria

**Files:**
- Modify: `libs/shared/rule/types/src/rule-definition.types.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/geolocation-and-address-precision/src/geolocation-and-address-precision.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/geolocation-and-address-precision/src/geolocation-and-address-precision.processor.ts`
- Test: `libs/methodologies/bold/rule-processors/mass-id/geolocation-and-address-precision/src/geolocation-and-address-precision.processor.spec.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/mass-id-sorting/src/mass-id-sorting.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/mass-id-sorting/src/mass-id-sorting.processor.ts`
- Test: `libs/methodologies/bold/rule-processors/mass-id/mass-id-sorting/src/mass-id-sorting.processor.spec.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/participant-accreditations-and-verifications-requirements/src/participant-accreditations-and-verifications-requirements.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/participant-accreditations-and-verifications-requirements/src/participant-accreditations-and-verifications-requirements.processor.ts`
- Test: `libs/methodologies/bold/rule-processors/mass-id/participant-accreditations-and-verifications-requirements/src/participant-accreditations-and-verifications-requirements.processor.spec.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.processor.ts`
- Test: `libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.processor.spec.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/weighing/src/weighing.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/weighing/src/weighing.processor.ts`
- Test: `libs/methodologies/bold/rule-processors/mass-id/weighing/src/weighing.processor.spec.ts`

**Interfaces:**
- Consumes: `DocumentQueryCriteria` from `@carrot-fndn/shared/methodologies/bold/io-helpers`.
- Produces: `BaseRuleDefinition<TInput = never>` with `input?: TInput`, plus one exported criteria constant per supported criteria-bearing processor, referenced by both its rule definition and processor.

- [ ] **Step 1: Write a failing compile-time usage test**

```typescript
export const RELATED_DOCUMENT_CRITERIA = {
  parentDocument: {},
  relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
} as const satisfies DocumentQueryCriteria;

export const ruleDefinition = {
  ...existingDefinition,
  input: RELATED_DOCUMENT_CRITERIA,
} satisfies BaseRuleDefinition<DocumentQueryCriteria>;
```

Apply the pattern to geolocation-and-address-precision, mass-id-sorting, participant-accreditations-and-verifications-requirements, prevented-emissions, and weighing. Update each processor test to assert `DocumentQueryService.load` receives its exported criteria constant by identity or exact equality. Keep no-conflicting-certificate-or-credit unsupported because its processor requires application-specific constructor arguments.

- [ ] **Step 2: Run type-check and the rule test**

Run `rtk pnpm nx ts shared-rule-types`, then run the `test` target for the five listed processor projects with `rtk pnpm nx run-many`.

Expected: FAIL because `BaseRuleDefinition` has no generic input and the shared constant is absent.

- [ ] **Step 3: Add the generic without a reverse methodology dependency**

```typescript
export interface BaseRuleDefinition<TInput = never> {
  events: RuleEventName[];
  input?: TInput;
  name: NonEmptyString;
  slug: Slug;
  version: SemVer;
}
```

Move each supported rule's existing criteria literal to one named constant, type it in the BOLD rule, and import it in both the definition and processor. Do not import BOLD types into `shared-rule-types`.

- [ ] **Step 4: Run focused tests and type-check**

Run `rtk pnpm nx ts shared-rule-types`, then run `test` and `ts` for all five listed processor projects with `rtk pnpm nx run-many`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/shared/rule/types libs/methodologies/bold/rule-processors/mass-id
rtk git commit -m "feat(rule): declare dry-run input criteria"
```

### Task 2: Move Assume-Role Credentials Into the Shared AWS HTTP Layer

**Files:**
- Create: `libs/shared/aws-http/src/aws-credentials.provider.ts`
- Modify: `libs/shared/aws-http/src/aws-http.service.helpers.ts`
- Modify: `libs/shared/aws-http/src/index.ts`
- Test: `libs/shared/aws-http/src/aws-credentials.provider.spec.ts`
- Modify: `libs/shared/rule/result/src/rule-result.helpers.ts`
- Test: `libs/shared/rule/result/src/rule-result.helpers.spec.ts`

**Interfaces:**
- Consumes: `SMAUG_API_GATEWAY_ASSUME_ROLE_ARN`, AWS SDK `fromEnv`, and `STSClient`.
- Produces: `provideSmaugApiCredentials(): AwsCredentialIdentityProvider`, shared by audit-result reporting and dry-run HTTP signing.

- [ ] **Step 1: Write failing provider tests**

```typescript
it('should assume the configured API Gateway role from base credentials', async () => {
  process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN = validRoleArn;
  await provideSmaugApiCredentials()();
  expect(stsMock).toHaveReceivedCommandWith(AssumeRoleCommand, { RoleArn: validRoleArn });
});

it.each([undefined, 'arn:aws:iam::1234:role/aws-api-gateway-role', 'invalid'])(
  'should reject unusable role ARN %s before signing',
  async (roleArn) => { /* set env and expect provider rejection */ },
);
```

- [ ] **Step 2: Run focused tests and verify no shared provider exists**

Run: `rtk pnpm nx test shared-aws-http && rtk pnpm nx test shared-rule-result`

Expected: FAIL because `provideSmaugApiCredentials` is absent.

- [ ] **Step 3: Extract the existing STS implementation**

```typescript
export const provideSmaugApiCredentials = (): AwsCredentialIdentityProvider => {
  const roleArn = requireValidSmaugApiRoleArn();
  return fromTemporaryCredentials({
    clientConfig: {},
    masterCredentials: fromEnv(),
    params: { RoleArn: roleArn, RoleSessionName: 'methodology-rules-smaug-api' },
  });
};
```

Move, do not duplicate, the assume-role behavior from `rule-result.helpers.ts`. Make the signer accept the provider. Reject the documented placeholder account before any request.

- [ ] **Step 4: Verify both consumers**

Run: `rtk pnpm nx run-many -t test ts lint -p shared-aws-http,shared-rule-result`

Expected: PASS and `rg -n 'AssumeRoleCommand|fromTemporaryCredentials' libs/shared` shows one implementation in `shared/aws-http`.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/shared/aws-http libs/shared/rule/result
rtk git commit -m "refactor(aws-http): share Smaug assumed credentials"
```

### Task 3: Load Explicit Environment Files Before Runtime Imports

**Files:**
- Modify: `tools/rule-runner-cli/src/main.ts`
- Modify: `libs/shared/cli/src/environment-loader.ts`
- Test: `libs/shared/cli/src/environment-loader.spec.ts`
- Test: `tools/rule-runner-cli/src/main.spec.ts`
- Modify: `.env-files/.env.test`

**Interfaces:**
- Consumes: `--env-file <path>` from `process.argv` and pre-existing shell variables.
- Produces: `loadEnvironment(path: string, options?: { override?: boolean }): void`, called before importing commands or auth configuration.

- [ ] **Step 1: Write failing precedence and import-order tests**

```typescript
it('should preserve an explicit shell value', () => {
  process.env.AUDIT_URL = 'https://shell.example';
  loadEnvironment(envFile);
  expect(process.env.AUDIT_URL).toBe('https://shell.example');
});

it('should load the requested file before importing the command module', async () => {
  process.argv.push('--env-file', envFile);
  await import('./main');
  expect(importOrder).toEqual(['environment', 'commands']);
});
```

- [ ] **Step 2: Run tests and verify `--env-file` is inert**

Run: `rtk pnpm nx test rule-runner-cli && rtk pnpm nx test shared-cli`

Expected: FAIL because startup loads only the hardcoded default and command imports occur first.

- [ ] **Step 3: Parse only the bootstrap flag, load, then dynamically import commands**

```typescript
const envFile = readOptionValue(process.argv, '--env-file') ?? '.env-files/.env.test';
loadEnvironment(envFile, { override: false });
const { runRuleCommand } = await import('./commands');
await runRuleCommand.parseAsync(process.argv);
```

Update `.env-files/.env.test` with the verified Carrot-owned deployed role ARN, never a third-party identifier or secret. Do not print the value.

- [ ] **Step 4: Run focused tests**

Run: `rtk pnpm nx run-many -t test ts lint -p shared-cli,rule-runner-cli`

Expected: PASS and shell precedence is covered.

- [ ] **Step 5: Commit**

```bash
rtk git add tools/rule-runner-cli libs/shared/cli .env-files/.env.test
rtk git commit -m "fix(rule-runner): load requested environment before auth"
```

### Task 4: Load an Explicit Processor and Colocated Rule Definition

**Files:**
- Modify: `tools/rule-runner-cli/src/utils/processor-loader.ts`
- Test: `tools/rule-runner-cli/src/utils/processor-loader.spec.ts`

**Interfaces:**
- Consumes: an explicit MassID processor directory.
- Produces: `loadLocalRuleModule(processorPath: string): Promise<{ Processor: RuleProcessorConstructor; ruleDefinition: BaseRuleDefinition<DocumentQueryCriteria | never>; rulesScope: 'MassID' }>`.

- [ ] **Step 1: Write failing module-loader tests**

```typescript
await expect(loadLocalRuleModule(rootOnlyPath)).resolves.toMatchObject({
  Processor: expect.any(Function),
  ruleDefinition: expect.objectContaining({ slug: expect.any(String) }),
  rulesScope: 'MassID',
});
await expect(loadLocalRuleModule(creditOrderPath)).rejects.toThrow('MassID');
await expect(loadLocalRuleModule(parameterizedMassIdPath)).rejects.toThrow('constructor');
```

Also prove missing, duplicate, or malformed `*.rule-definition.ts` exports fail deterministically. Use isolated temporary fixtures for out-of-scope and parameterized-constructor rejection so negative cases do not depend on unrelated production processors. Keep a real `privacy-flags` module load as the positive end-to-end loader case.

- [ ] **Step 2: Run the loader tests and verify definition loading is absent**

Run: `rtk pnpm nx test rule-runner-cli --testNamePattern='loadLocalRuleModule'`

Expected: FAIL because the loader returns only a processor constructor.

- [ ] **Step 3: Implement one module load and structural scope validation**

```typescript
export const loadLocalRuleModule = async (processorPath: string): Promise<LocalRuleModule> => {
  const scope = resolveRuleScopeFromPath(processorPath);
  if (scope !== 'MassID') throw new UnsupportedLocalRuleScopeError(scope);
  const [Processor, ruleDefinition] = await Promise.all([
    loadProcessor(processorPath),
    loadRuleDefinition(processorPath),
  ]);
  return { Processor, ruleDefinition, rulesScope: scope };
};
```

Resolve exact filenames with the existing path conventions and validate the rule definition shape at the filesystem boundary. Inspect the processor constructor contract and reject a constructor that requires application-specific arguments; do not call it with missing values or introduce an executable factory into the rule definition.

- [ ] **Step 4: Run focused tests and type-check**

Run: `rtk pnpm nx test rule-runner-cli --testNamePattern='loadLocalRuleModule' && rtk pnpm nx ts rule-runner-cli`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add tools/rule-runner-cli/src/utils/processor-loader.ts tools/rule-runner-cli/src/utils/processor-loader.spec.ts
rtk git commit -m "feat(rule-runner): load local rule definitions"
```

### Task 5: Add the SigV4 Local Preparation Client

**Files:**
- Modify: `tools/rule-runner-cli/src/utils/smaug-client.ts`
- Test: `tools/rule-runner-cli/src/utils/smaug-client.spec.ts`
- Modify: `libs/shared/http-request/src/http-request.ts`
- Test: `libs/shared/http-request/src/http-request.spec.ts`

**Interfaces:**
- Consumes: Task 2 credential provider and Smaug `POST /methodologies/dry-run/prepare-local-rule`.
- Produces: `prepareLocalRule(request: LocalRuleDryRunPrepareRequest): Promise<LocalRuleDryRunPrepareResponse>`.

- [ ] **Step 1: Write failing request and redaction tests**

```typescript
await client.prepareLocalRule(request);
expect(http.post).toHaveBeenCalledWith(
  '/methodologies/dry-run/prepare-local-rule',
  request,
  expect.objectContaining({ headers: expect.objectContaining({ authorization: expect.any(String) }) }),
);

expect(redactHttpError(errorWithSignedHeaders)).not.toContain('authorization');
expect(redactHttpError(errorWithSignedHeaders)).not.toContain('x-amz-security-token');
```

- [ ] **Step 2: Run tests and verify the endpoint/client path is absent**

Run: `rtk pnpm nx test rule-runner-cli && rtk pnpm nx test shared-http-request`

Expected: FAIL because `prepareLocalRule` and complete signed-header redaction do not exist.

- [ ] **Step 3: Implement the signed call and narrow error logging**

```typescript
const signedRequest = await signRequest({
  credentials: provideSmaugApiCredentials(),
  method: 'POST',
  url,
  body: JSON.stringify(request),
});
return httpRequest<LocalRuleDryRunPrepareResponse>(signedRequest);
```

Redact `authorization`, `x-amz-security-token`, `x-amz-date`, and all other `x-amz-*` headers case-insensitively. Log status, error code, and safe identifiers only; never serialize the Axios request/config object.

- [ ] **Step 4: Run focused project gates**

Run: `rtk pnpm nx run-many -t test ts lint -p rule-runner-cli,shared-http-request,shared-aws-http`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add tools/rule-runner-cli/src/utils/smaug-client.ts tools/rule-runner-cli/src/utils/smaug-client.spec.ts libs/shared/http-request
rtk git commit -m "feat(rule-runner): sign local dry-run preparation"
```

### Task 6: Split Explicit Local and Registered CLI Contracts

**Files:**
- Modify: `tools/rule-runner-cli/src/commands/dry-run.command.ts`
- Modify: `tools/rule-runner-cli/src/commands/dry-run.handler.ts`
- Modify: `tools/rule-runner-cli/src/commands/dry-run-batch.handler.ts`
- Modify: `tools/rule-runner-cli/src/utils/rule-input.builder.ts`
- Test: `tools/rule-runner-cli/src/commands/dry-run.handler.spec.ts`
- Test: `tools/rule-runner-cli/src/commands/dry-run-batch.handler.spec.ts`
- Test: `tools/rule-runner-cli/src/utils/rule-input.builder.spec.ts`

**Interfaces:**
- Consumes: Tasks 4-5 local module/client and existing registered preparation response.
- Produces: explicit command `pnpm run-rule dry-run <processor-path> --document-id <id> --data-set-name TEST`; registered command behavior remains unchanged.

- [ ] **Step 1: Write failing local-mode and regression tests**

```typescript
it('should prepare and execute one explicit root-only processor', async () => {
  await handleDryRun(processorPath, localOptions);
  expect(smaug.prepareLocalRule).toHaveBeenCalledWith(expect.objectContaining({
    dataSetName: 'TEST', input: undefined, rulesScope: 'MassID', ruleSlug,
  }));
  expect(Processor).toHaveBeenCalledTimes(1);
});

it.each(['methodologySlug', 'rulesScope', 'ruleSlug', 'allRules'] as const)(
  'should reject %s in explicit local mode',
  async (flag) => expect(runWithFlag(flag)).rejects.toThrow('cannot be used with an explicit processor path'),
);
```

Add tests that nested input is forwarded unchanged; explicit processor exceptions reject; registered responses still execute their `rules` array; batch loads the module once, constructs once per document, records errors, and sets nonzero exit state. Assert endpoint exclusivity explicitly: local mode never calls `prepareDryRun`, and registered mode never calls `prepareLocalRule`.

- [ ] **Step 2: Run rule-runner tests and verify the old mandatory methodology contract fails them**

Run: `rtk pnpm nx test rule-runner-cli`

Expected: FAIL because `--methodology-slug` is mandatory and the handler expects a `rules` array for every mode.

- [ ] **Step 3: Implement an explicit discriminated mode**

```typescript
type DryRunSelection =
  | { mode: 'local'; dataSetName: DataSetName; processorPath: string }
  | { mode: 'registered'; allRules: boolean; methodologySlug: string; ruleSlug?: string; rulesScope: string };
```

Build the selection once in the command, reject mixed flags, and pass it to handlers. Local mode calls `prepareLocalRule`, builds one `RuleInput`, instantiates the processor per document, and lets exceptions reject. Registered mode keeps the existing preparation and error-to-result behavior.

Make `--methodology-slug` conditionally required in registered mode. Use Commander's option-value source so the default `rulesScope: 'MassID'` does not count as an explicitly supplied forbidden flag in local mode.

- [ ] **Step 4: Run focused project gates**

Run: `rtk pnpm nx run-many -t test ts lint -p rule-runner-cli`

Expected: PASS, including registered regression tests.

- [ ] **Step 5: Commit**

```bash
rtk git add tools/rule-runner-cli
rtk git commit -m "feat(rule-runner): execute unbound MassID rules"
```

### Task 7: Document the Smaug-Only Runtime Boundary

**Files:**
- Modify: `README.md`
- Modify: `.ai/PROJECT_CONTEXT.md`
- Modify: `tools/rule-runner-cli/src/commands/dry-run.command.ts`
- Modify: `tools/rule-runner-cli/src/commands/dry-run.command.spec.ts`
- Regenerate: `AGENTS.md`
- Regenerate: `CLAUDE.md`
- Regenerate: `.cursor/rules/project-context.mdc`

**Interfaces:**
- Consumes: the completed local-rule CLI flow.
- Produces: usage and architecture guidance that names Smaug as the only runtime API dependency.

- [ ] **Step 1: Add failing documentation and help assertions**

Assert the document argument help is exactly `MassID document ID`, the README contains a local processor example, and the project context states that unbound execution retrieves and stages snapshots through Smaug without calling Palantir directly.

- [ ] **Step 2: Run the focused test and observe the stale wording**

Run: `rtk pnpm nx test rule-runner-cli`

Expected: FAIL while the help text still identifies the argument as a Palantir document ID.

- [ ] **Step 3: Update canonical documentation and regenerate adapters**

Document local and registered examples separately. Keep the architecture statement in `.ai/PROJECT_CONTEXT.md`, then run `rtk pnpm ai:sync`; do not edit generated adapters directly.

- [ ] **Step 4: Verify documentation parity**

Run: `rtk pnpm ai:check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add README.md .ai/PROJECT_CONTEXT.md tools/rule-runner-cli AGENTS.md CLAUDE.md .cursor/rules/project-context.mdc
rtk git commit -m "docs(rule-runner): define Smaug dry-run boundary"
```

### Task 8: Validate the Entire Changed Surface and Live CLI Boundary

**Files:**
- Verify only: every file changed on the feature branch

**Interfaces:**
- Consumes: the complete Methodology Rules implementation.
- Produces: exact-project gate evidence, local CLI evidence, and an explicit post-deployment production acceptance gate.

- [ ] **Step 1: Derive the exact changed projects without `nx affected`**

Map `rtk git diff --name-only origin/main...HEAD` to owning `project.json` files. The expected branch surface is 25 projects: nine application projects, six BOLD rule-processor libraries, `rule-runner-cli`, and nine shared libraries. If the diff changes, use the newly derived set rather than this snapshot.

- [ ] **Step 2: Run all supported targets for the six changed processor libraries**

Run `test`, `test-e2e`, `ts`, and `lint` for:

```text
methodologies-bold-rule-processors-mass-id-document-manifest-data
methodologies-bold-rule-processors-mass-id-geolocation-and-address-precision
methodologies-bold-rule-processors-mass-id-mass-id-sorting
methodologies-bold-rule-processors-mass-id-participant-accreditations-and-verifications-requirements
methodologies-bold-rule-processors-mass-id-prevented-emissions
methodologies-bold-rule-processors-mass-id-weighing
```

Use `rtk pnpm nx run-many -t test test-e2e ts lint -p <comma-separated-projects>`.

- [ ] **Step 3: Run `ts` and `lint` for the nine changed application projects**

Run those targets for the BOLD Carbon and BOLD Recycling application projects owning geolocation-and-address-precision, mass-id-sorting, participant-accreditations-and-verifications-requirements, prevented-emissions where present, and weighing. Derive their exact Nx names from their `project.json` files before invoking `run-many`.

- [ ] **Step 4: Run every supported gate for the ten changed tool/shared projects**

Verify targets from each `project.json`, then run their supported combination of `test`, `ts`, and `lint` for `rule-runner-cli`, `shared-aws-http`, `shared-cli`, `shared-helpers`, `shared-http-request`, `shared-lambda-wrapper`, `shared-methodologies-bold-io-helpers`, `shared-rule-result`, `shared-rule-types`, and `shared-testing`.

- [ ] **Step 5: Run repository-level generated, formatting, and diff checks**

Run `rtk pnpm nx format:check`, `rtk pnpm ai:check`, and `rtk git diff --check`.

- [ ] **Step 6: Run the active privacy scan over the complete branch delta**

Inspect `rtk git diff origin/main...HEAD --word-diff=porcelain` for proper nouns and production-like identifiers. Replace every third-party name or real identifier in docs, tests, fixtures, skills, comments, and commit messages with fictional data or placeholders.

- [ ] **Step 7: Exercise both CLI modes locally**

Run local-rule mode through the real CLI against a controlled Smaug HTTP fixture and verify the signed preparation request, one processor execution per document, and no audit-result submission. Run registered mode through the same CLI fixture and verify the existing preparation and multi-rule behavior remain intact.

- [ ] **Step 8: Record the post-deployment acceptance gate**

Record `PENDING_OPERATOR: after the Smaug endpoint is deployed, run the coordinated production TEST acceptance matrix: a freshly generated confirmed-absent document ID proving assumed-role SigV4 acceptance and missing-snapshot rejection; a root-only unbound processor; a related-snapshot unbound processor; a registered dry run; a known-invalid case; and a rejected control request using the base SSO role.` Each successful real-document run and every production mutation requires separate authorization. Never commit a real document identifier or production payload.

### Task 9: Finalize the Coordinated RCA Evidence

**Files:**
- Modify: `docs/superpowers/rcas/2026-08-30-unbound-rule-dry-run-architecture.md`

**Owner:** Ship controller after the Smaug, Methodology Rules, and Palantir guardrail PRs exist.

- [ ] **Step 1: Revalidate every causal claim against current repository evidence**

Confirm the existing registered Smaug dry-run path, composed snapshot service, closed Palantir endpoint PR, and final Methodology Rules runtime dependency graph. Remove or mark any claim that cannot be revalidated.

- [ ] **Step 2: Map each corrective action to proof**

Record the descriptive PR link, exact implementation or documentation path, detector red/green evidence, and remaining operator-gated acceptance item for every corrective action. Do not mark the RCA complete while an action lacks evidence.

- [ ] **Step 3: Review and commit the RCA**

Run the active privacy scan and `rtk pnpm exec prettier --check docs/superpowers/rcas/2026-08-30-unbound-rule-dry-run-architecture.md`, then commit the exact RCA path. Never include production document identifiers or third-party data.
