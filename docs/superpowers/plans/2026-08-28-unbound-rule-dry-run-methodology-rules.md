# Methodology Rules Unbound Dry-Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `run-rule dry-run` execute one explicit local MassID processor against Smaug-prepared live input without requiring methodology registration.

**Architecture:** Rule definitions optionally carry the same declarative BOLD query criteria their processors consume. Explicit path mode loads the processor and definition together, calls a separate SigV4-signed Smaug preparation endpoint, and instantiates the processor once per document; registered mode keeps its current contract.

**Tech Stack:** Node.js 24.14.1, TypeScript, Commander, Zod, AWS STS and SigV4, Axios, Vitest, Nx, pnpm 10.18.3

**Spec:** `docs/superpowers/specs/2026-08-28-unbound-rule-dry-run-design.md`

## Global Constraints

- Explicit local mode supports MassID processors only.
- Explicit local mode rejects processors whose construction requires application-specific arguments.
- Registered processor-path and `--all-rules` dry-runs remain behaviorally unchanged.
- Root-only definitions declare the shared empty `BOLD_ROOT_DOCUMENT_CRITERIA`; rules with the common related-document graph import one shared criteria constant in both definition and processor.
- Explicit local mode rejects `--methodology-slug`, `--rules-scope`, `--rule-slug`, `--all-rules`, and `--config`; registered mode rejects `--data-set-name`.
- Explicit local single-document preparation failures, processor exceptions, and normal `FAILED` outputs exit nonzero; batch records errors and exits nonzero.
- `aws-vault exec smaug-prod` provides base credentials; requests use assumed-role SigV4 credentials.
- Shell environment variables override `--env-file`; configuration loads before modules that read it.
- A requested environment file that is missing or unreadable fails closed without dotenv diagnostic output.
- Sequential and concurrent signed requests reuse unexpired assumed credentials and refresh them before expiration.
- Never persist fetched documents or log documents, credentials, signed headers, or full Axios request objects.
- The CLI calls only Smaug's signed preparation API; it never calls Palantir or reads either service's database.
- Production TEST-dataset end-to-end execution is an operator-gated task.

## Phase 4 Execution Baseline

The branch contains the core implementations described by Tasks 1–6. Phase 4 reviews Tasks 1 and 4 against their current implementation commits and records them complete without manufacturing a new commit when the review is clean. Tasks 2, 3, 5, and 6 add the failing regressions named below, fix the verified gaps in the current implementation, and commit only those corrective deltas. Tasks 7–9 are implementation or verification-owned work.

---

### Task 1: Add Typed Rule-Definition Input and Share Every Supported BOLD Criteria

**Files:**
- Modify: `libs/shared/rule/types/src/rule-definition.types.ts`
- Create: `libs/shared/methodologies/bold/io-helpers/src/document-query.criteria.ts`
- Create: `libs/shared/methodologies/bold/io-helpers/src/document-query.criteria.spec.ts`
- Modify: `libs/shared/methodologies/bold/io-helpers/src/index.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/geolocation-and-address-precision/src/geolocation-and-address-precision.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/geolocation-and-address-precision/src/geolocation-and-address-precision.processor.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/mass-id-sorting/src/mass-id-sorting.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/mass-id-sorting/src/mass-id-sorting.processor.ts`
- Test: `libs/methodologies/bold/rule-processors/mass-id/mass-id-sorting/src/mass-id-sorting.processor.spec.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/participant-accreditations-and-verifications-requirements/src/participant-accreditations-and-verifications-requirements.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/participant-accreditations-and-verifications-requirements/src/participant-accreditations-and-verifications-requirements.processor.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.processor.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/weighing/src/weighing.rule-definition.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/weighing/src/weighing.processor.ts`
- Modify: `libs/methodologies/bold/rule-processors/mass-id/privacy-flags/src/privacy-flags.rule-definition.ts`
- Modify: `apps/methodologies/bold-carbon/rule-processors/mass-id/geolocation-and-address-precision/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-carbon/rule-processors/mass-id/mass-id-sorting/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-carbon/rule-processors/mass-id/participant-accreditations-and-verifications-requirements/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-carbon/rule-processors/mass-id/prevented-emissions/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-carbon/rule-processors/mass-id/weighing/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-recycling/rule-processors/mass-id/geolocation-and-address-precision/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-recycling/rule-processors/mass-id/mass-id-sorting/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-recycling/rule-processors/mass-id/participant-accreditations-and-verifications-requirements/src/rule-definition.ts`
- Modify: `apps/methodologies/bold-recycling/rule-processors/mass-id/weighing/src/rule-definition.ts`

**Interfaces:**
- Consumes: `DocumentQueryCriteria` from `@carrot-fndn/shared/methodologies/bold/io-helpers`.
- Produces: `BaseRuleDefinition<TInput = never>` and `RuleDefinition<TMethodologyFrameworkRuleSlug, TInput>` with `input?: TInput`, plus shared `PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA` and `BOLD_ROOT_DOCUMENT_CRITERIA` constants referenced by supported definitions and processors.

- [ ] **Step 1: Write the failing explicit root-criteria tests**

```typescript
export const PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA = {
  parentDocument: {},
  relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
} as const satisfies DocumentQueryCriteria;

export const ruleDefinition = {
  description:
    'Validates sorting events in MassID documents, ensuring that gross weight, deducted weight, sorting factor, and event values are correctly calculated and formatted.',
  events: [BoldDocumentEventName.SORTING],
  input: PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
  name: 'Mass Sorting',
  slug: 'mass-id-sorting',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition<DocumentQueryCriteria>;
```

Define `PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA` once in the shared BOLD IO helper because all five processor literals are identical. Apply it to the processor loads for geolocation-and-address-precision, mass-id-sorting, participant-accreditations-and-verifications-requirements, prevented-emissions, and weighing, and to the first four rule definitions. Keep weighing's definition without `input` because its complete execution input also includes an attachment-bucket read and optional Textract cache outside Smaug's staged snapshot. Define `BOLD_ROOT_DOCUMENT_CRITERIA = {}` in the same owner and apply it to the privacy-flags rule definition so root-only eligibility is explicit rather than inferred from constructor arity. Type the nine application definitions with the same input generic. Add one processor contract assertion that `DocumentQueryService.load` receives the shared participant-accreditation criteria and schema tests that validate both constants. Keep no-conflicting-certificate-or-credit unsupported because its processor requires application-specific constructor arguments; keep waste-mass-is-unique unsupported because it performs live duplicate-document API queries outside the staged graph.

- [ ] **Step 2: Run type-check and the rule tests**

Run `rtk pnpm nx ts shared-rule-types`, then run the `test` target for the five participant-accreditation criteria consumers plus the privacy-flags root-only project with `rtk pnpm nx run-many`.

Expected: FAIL because `BOLD_ROOT_DOCUMENT_CRITERIA` does not exist and privacy-flags does not yet declare an explicit static input graph; the five existing related-criteria cases remain green.

- [ ] **Step 3: Implement the shared root criteria without changing the generic boundary**

```typescript
export interface BaseRuleDefinition<TInput = never> {
  events: RuleEventName[];
  input?: TInput;
  name: NonEmptyString;
  slug: Slug;
  version: SemVer;
}
```

Move the five byte-equivalent criteria literals to the shared BOLD IO helper, type the constant there, and import it in all five processors and the four definitions whose complete input Smaug stages. Leave weighing without a definition input until its attachment path is Smaug-staged. Add the shared empty root constant to privacy-flags. Propagate the input generic through the application `RuleDefinition` declarations. Do not import BOLD types into `shared-rule-types`.

- [ ] **Step 4: Run focused tests and type-check**

Run `rtk pnpm nx ts shared-rule-types`, then run `test` and `ts` for the five participant-accreditation criteria consumers plus the privacy-flags root-only project with `rtk pnpm nx run-many`.

Expected: PASS.

- [ ] **Step 5: Commit the explicit root-input correction**

Record `112944b8` (typed dry-run input criteria) and `8646193b` (unbound dry-run boundary validation) in the task-review ledger, then commit the shared root criteria and privacy-flags definition correction:

```bash
rtk git add libs/shared/methodologies/bold/io-helpers/src/document-query.criteria.ts libs/shared/methodologies/bold/io-helpers/src/document-query.criteria.spec.ts libs/methodologies/bold/rule-processors/mass-id/privacy-flags/src/privacy-flags.rule-definition.ts
rtk git commit -m "fix(rule): declare static unbound input"
```

### Task 2: Move Assume-Role Credentials Into the Shared AWS HTTP Layer

**Files:**
- Create: `libs/shared/aws-http/src/aws-credentials.provider.ts`
- Modify: `libs/shared/aws-http/src/aws-http.service.helpers.ts`
- Modify: `libs/shared/aws-http/src/index.ts`
- Test: `libs/shared/aws-http/src/aws-credentials.provider.spec.ts`
- Modify: `libs/shared/rule/result/src/rule-result.helpers.ts`
- Test: `libs/shared/rule/result/src/rule-result.helpers.spec.ts`
- Modify: `libs/shared/rule/result/src/rule-result.schemas.ts`
- Modify: `.vitest/config/vitest.e2e.base.config.ts`
- Create: `.vitest/mocks/aws-http.e2e.mock.ts`
- Modify: `libs/shared/testing/src/helpers/e2e.helpers.ts`
- Test: `libs/shared/lambda/wrapper/src/lambda-wrapper.spec.ts`
- Test: `libs/methodologies/bold/rule-processors/mass-id/document-manifest-data/src/document-manifest-data.lambda.e2e.spec.ts`

**Interfaces:**
- Consumes: `SMAUG_API_GATEWAY_ASSUME_ROLE_ARN`, AWS SDK `fromEnv`, and `STSClient`.
- Produces: `provideSmaugApiCredentials(): AwsCredentialIdentityProvider`, shared by audit-result reporting and dry-run HTTP signing, with one expiration-aware cache and one in-flight refresh per role ARN.

- [ ] **Step 1: Write failing provider tests**

```typescript
it('should configure the API Gateway role lazily from base credentials', async () => {
  process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN = validRoleArn;
  const provider = provideSmaugApiCredentials();
  expect(fromTemporaryCredentials).not.toHaveBeenCalled();
  await provider();
  expect(fromTemporaryCredentials).toHaveBeenCalledWith(expect.objectContaining({
    masterCredentials: expect.any(Function),
    params: { RoleArn: validRoleArn, RoleSessionName: 'methodology-rules-smaug-api' },
  }));
});

it.each([undefined, 'arn:aws:iam::1234:role/aws-api-gateway-role', 'invalid'])(
  'should reject unusable role ARN %s before signing',
  async (roleArn) => {
    if (roleArn === undefined) {
      delete process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN;
    } else {
      process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN = roleArn;
    }

    await expect(provideSmaugApiCredentials()()).rejects.toThrow();
    expect(fromTemporaryCredentials).not.toHaveBeenCalled();
  },
);

it('should coalesce concurrent resolution and reuse unexpired credentials', async () => {
  process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN = concurrentRoleArn;
  const provider = provideSmaugApiCredentials();
  const [first, second] = await Promise.all([provider(), provider()]);
  expect(first).toBe(second);
  expect(assumeRoleProvider).toHaveBeenCalledTimes(1);
});

it('should reuse unexpired credentials across sequential resolutions', async () => {
  process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN = sequentialRoleArn;
  const provider = provideSmaugApiCredentials();
  await provider();
  await provider();
  expect(assumeRoleProvider).toHaveBeenCalledTimes(1);
});

it('should coalesce refresh within five minutes of expiration', async () => {
  process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN = expiringRoleArn;
  vi.setSystemTime('2026-08-30T12:00:00.000Z');
  assumeRoleProvider.mockResolvedValue({
    ...credentials,
    expiration: new Date('2026-08-30T13:00:00.000Z'),
  });
  const provider = provideSmaugApiCredentials();
  await provider();
  vi.setSystemTime('2026-08-30T12:56:00.000Z');
  await Promise.all([provider(), provider()]);
  expect(assumeRoleProvider).toHaveBeenCalledTimes(2);
});

it('should retry after a rejected refresh', async () => {
  process.env.SMAUG_API_GATEWAY_ASSUME_ROLE_ARN = rejectedRefreshRoleArn;
  vi.setSystemTime('2026-08-30T12:00:00.000Z');
  assumeRoleProvider
    .mockResolvedValueOnce({
      ...credentials,
      expiration: new Date('2026-08-30T13:00:00.000Z'),
    })
    .mockRejectedValueOnce(new Error('STS unavailable'))
    .mockResolvedValueOnce(refreshedCredentials);
  const provider = provideSmaugApiCredentials();
  await provider();
  vi.setSystemTime('2026-08-30T12:56:00.000Z');
  await expect(provider()).rejects.toThrow('STS unavailable');
  await expect(provider()).resolves.toEqual(refreshedCredentials);
  expect(assumeRoleProvider).toHaveBeenCalledTimes(3);
});
```

Use distinct valid role ARNs for `concurrentRoleArn`, `sequentialRoleArn`, `expiringRoleArn`, and `rejectedRefreshRoleArn` so the module-level provider map cannot leak cached state between cases. Restore real timers and the original environment after each test.

- [ ] **Step 2: Run focused tests and verify the current cache is insufficient**

Run: `rtk pnpm nx test shared-aws-http`, then `rtk pnpm nx test shared-rule-result`.

Expected: FAIL because the current factory validates the role eagerly and repeated provider calls invoke the underlying assume-role provider again.

- [ ] **Step 3: Extract the existing STS implementation**

```typescript
const resolveSmaugApiCredentials: AwsCredentialIdentityProvider = async () => {
  const roleArn = requireValidSmaugApiRoleArn();
  const source =
    providersByRoleArn.get(roleArn) ??
    memoizeCredentials(
      fromTemporaryCredentials({
        clientConfig: {},
        masterCredentials: fromEnv(),
        params: { RoleArn: roleArn, RoleSessionName: 'methodology-rules-smaug-api' },
      }),
    );

  providersByRoleArn.set(roleArn, source);
  return source();
};

export const provideSmaugApiCredentials = (): AwsCredentialIdentityProvider =>
  resolveSmaugApiCredentials;

const memoizeCredentials = (
  source: AwsCredentialIdentityProvider,
): AwsCredentialIdentityProvider => {
  const refreshWindowMilliseconds = 5 * 60_000;
  let cached: Awaited<ReturnType<AwsCredentialIdentityProvider>> | undefined;
  let inFlight: ReturnType<AwsCredentialIdentityProvider> | undefined;

  return async () => {
    const refreshAfter = Date.now() + refreshWindowMilliseconds;

    if (
      cached !== undefined &&
      (cached.expiration === undefined || cached.expiration.getTime() > refreshAfter)
    ) {
      return cached;
    }

    inFlight ??= source().then((credentials) => {
      cached = credentials;
      return credentials;
    });

    try {
      return await inFlight;
    } finally {
      inFlight = undefined;
    }
  };
};
```

Move, do not duplicate, the assume-role behavior from `rule-result.helpers.ts`. Keep role validation and `fromTemporaryCredentials` creation inside the returned provider so a localhost request can bypass signing without requiring AWS configuration. Implement `memoizeCredentials` with one cached identity, one shared in-flight promise, and a five-minute refresh window based on `expiration`; identities without an expiration remain cached. Make the signer accept the provider. Reject malformed role ARNs before a signed request.

- [ ] **Step 4: Verify both consumers**

Run: `rtk pnpm nx run-many -t test ts lint -p shared-aws-http,shared-rule-result`

Expected: PASS and `rg -n 'AssumeRoleCommand|fromTemporaryCredentials' libs/shared` shows one implementation in `shared/aws-http`.

- [ ] **Step 5: Commit**

```bash
rtk git add .vitest/config/vitest.e2e.base.config.ts .vitest/mocks/aws-http.e2e.mock.ts libs/methodologies/bold/rule-processors/mass-id/document-manifest-data/src/document-manifest-data.lambda.e2e.spec.ts libs/shared/aws-http libs/shared/lambda/wrapper/src/lambda-wrapper.spec.ts libs/shared/rule/result libs/shared/testing/src/helpers/e2e.helpers.ts
rtk git commit -m "fix(aws-http): reuse assumed credentials"
```

### Task 3: Load Explicit Environment Files Before Runtime Imports

**Files:**
- Modify: `tools/rule-runner-cli/src/main.ts`
- Create: `libs/shared/env/src/environment-loader.ts`
- Create: `libs/shared/env/src/environment-loader.spec.ts`
- Modify: `libs/shared/env/src/index.ts`
- Modify: `libs/shared/cli/src/environment-loader.ts`
- Delete: `libs/shared/cli/src/environment-loader.spec.ts`
- Test: `tools/rule-runner-cli/src/main.spec.ts`
- Modify: `.env-files/.env.test`

**Interfaces:**
- Consumes: `--env-file <path>` from `process.argv` and pre-existing shell variables.
- Produces: process-wide bootstrap `loadEnvironment(path?: string, options?: { override?: boolean }): void` from `@carrot-fndn/shared/env`, which writes `process.env` before importing the shared CLI runtime, commands, logging, or auth configuration.

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

it('should reject a missing requested environment file', () => {
  expect(() => loadEnvironment('missing.env')).toThrow('missing.env');
});

it.each([['--env-file'], ['--env-file='], ['--env-file', '--debug']])(
  'should reject malformed bootstrap arguments %j',
  async (...arguments_) => {
    process.argv.push(...arguments_);
    await expect(import('./main')).rejects.toThrow('--env-file');
  },
);

it.each([missingEnvironmentFile, environmentDirectory])(
  'should fail quietly when %s cannot be read as an environment file',
  (environmentFile) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(() => loadEnvironment(environmentFile)).toThrow(environmentFile);
    expect(log).not.toHaveBeenCalled();
  },
);
```

- [ ] **Step 2: Run tests and verify the current bootstrap gaps**

Run: `rtk pnpm nx test rule-runner-cli`, then `rtk pnpm nx test shared-env`.

Expected: FAIL because the current shared CLI barrel imports environment consumers first, malformed option values are accepted, dotenv diagnostics are printed, and unreadable files do not fail closed.

- [ ] **Step 3: Parse only the bootstrap flag, load, then dynamically import commands**

```typescript
const environmentFile = readOptionValue(process.argv, '--env-file');
loadEnvironment(environmentFile, { override: false });
const { runProgram } = await import('@carrot-fndn/shared/cli');
const { dryRunCommand } = await import('./commands/dry-run.command');
const { runCommand } = await import('./commands/run.command');
```

Make `readOptionValue` reject an empty value, a missing value, or a following option token. In `loadEnvironment`, use dotenv with `quiet: true`, preserve shell precedence, and throw when dotenv returns an error. Create `environmentDirectory` with the test fixture setup so the unreadable-path case receives a real directory rather than relying on permissions. Keep the shared CLI path as a compatibility re-export of the shared environment owner. Update `.env-files/.env.test` with the verified Carrot-owned deployed role ARN, never a third-party identifier or secret. Do not print the value.

- [ ] **Step 4: Run focused tests**

Run: `rtk pnpm nx run-many -t test ts lint -p shared-env,shared-cli,rule-runner-cli`

Expected: PASS and shell precedence is covered.

- [ ] **Step 5: Commit**

```bash
rtk git add tools/rule-runner-cli libs/shared/env libs/shared/cli .env-files/.env.test
rtk git commit -m "fix(rule-runner): fail closed during environment bootstrap"
```

### Task 4: Load an Explicit Processor and Colocated Rule Definition

**Files:**
- Modify: `tools/rule-runner-cli/src/utils/processor-loader.ts`
- Test: `tools/rule-runner-cli/src/utils/processor-loader.spec.ts`
- Modify: `tools/rule-runner-cli/src/commands/dry-run.handler.ts`
- Test: `tools/rule-runner-cli/src/commands/dry-run.handler.spec.ts`
- Test: `tools/rule-runner-cli/src/commands/local-log-redaction.spec.ts`

**Interfaces:**
- Consumes: an explicit MassID processor directory.
- Produces: `loadLocalRuleModule(processorPath: string): Promise<{ Processor: RuleProcessorConstructor; ruleDefinition: BaseRuleDefinition<DocumentQueryCriteria> & { input: DocumentQueryCriteria }; rulesScope: 'MassID' }>`.

- [ ] **Step 1: Write the failing static-input eligibility tests**

```typescript
await expect(loadLocalRuleModule(rootOnlyPath)).resolves.toMatchObject({
  Processor: expect.any(Function),
  ruleDefinition: expect.objectContaining({ slug: expect.any(String) }),
  rulesScope: 'MassID',
});
await expect(loadLocalRuleModule(creditOrderPath)).rejects.toThrow('MassID');
await expect(loadLocalRuleModule(parameterizedMassIdPath)).rejects.toThrow('constructor');
await expect(loadLocalRuleModule(defaultedConstructorPath)).resolves.toMatchObject({
  Processor: expect.any(Function),
  rulesScope: 'MassID',
});
```

Also prove missing, duplicate, or malformed `*.rule-definition.ts` exports fail deterministically. Use isolated temporary fixtures for out-of-scope, required-constructor rejection, and defaulted-constructor acceptance so edge cases do not depend on unrelated production processors. Keep a real `privacy-flags` module load as the positive end-to-end loader case.
Require every local rule definition to declare `input`, accepting the shared empty root criteria as a complete graph. Add the real `waste-mass-is-unique` and weighing modules as negative cases proving that zero constructor arity without a complete declared static input is rejected before execution.

- [ ] **Step 2: Run the complete rule-runner test target**

Run: `rtk pnpm nx test rule-runner-cli`

Expected: FAIL because constructor arity alone still accepts `waste-mass-is-unique`, weighing, and a fixture whose definition omits `input`; the defaulted-constructor case with `input: {}` remains eligible.

- [ ] **Step 3: Add the explicit static-input guard to the existing loader**

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

Resolve exact filenames with the existing path conventions and validate the rule definition shape at the filesystem boundary. Inspect the processor constructor contract and reject a constructor that requires application-specific arguments; do not call it with missing values or introduce an executable factory into the rule definition. Separately reject a definition whose `input` is absent, because constructor arity cannot prove that a processor avoids live queries outside the staged graph.

- [ ] **Step 4: Run focused tests and type-check**

Run: `rtk pnpm nx test rule-runner-cli`, then `rtk pnpm nx ts rule-runner-cli`.

Expected: PASS.

- [ ] **Step 5: Commit the static-input eligibility guard**

Record `19620d56` (local rule-definition loading) and `8646193b` (unbound dry-run boundary validation) in the task-review ledger, then commit the eligibility detector and guard:

```bash
rtk git add tools/rule-runner-cli/src/utils/processor-loader.ts tools/rule-runner-cli/src/utils/processor-loader.spec.ts tools/rule-runner-cli/src/commands/dry-run.handler.ts tools/rule-runner-cli/src/commands/dry-run.handler.spec.ts tools/rule-runner-cli/src/commands/local-log-redaction.spec.ts
rtk git commit -m "fix(script): require static unbound input"
```

### Task 5: Add the SigV4 Local Preparation Client

**Files:**
- Modify: `tools/rule-runner-cli/src/utils/smaug-client.ts`
- Test: `tools/rule-runner-cli/src/utils/smaug-client.spec.ts`
- Modify: `libs/shared/http-request/src/http-request.ts`
- Test: `libs/shared/http-request/src/http-request.spec.ts`

**Interfaces:**
- Consumes: Task 2 credential provider and Smaug `POST /methodologies/dry-run/prepare-local-rule`.
- Produces: `prepareLocalRule(smaugUrl: string, request: LocalRuleDryRunPrepareRequest): Promise<LocalRuleDryRunPrepareResponse>`.

- [ ] **Step 1: Write failing request and redaction tests**

```typescript
await prepareLocalRule(smaugUrl, request);
expect(httpRequest).toHaveBeenCalledWith(
  {
    baseURL: smaugUrl,
    data: request,
    method: 'POST',
    url: '/methodologies/dry-run/prepare-local-rule',
  },
  { credentials: expect.any(Function) },
);
```

Add `http-request` tests proving full signed error configs and every case-insensitive `authorization` or `x-amz-*` header are excluded from logs. Add a localhost `baseURL` case proving the controlled fixture does not resolve the returned credential provider or invoke the signer, even when AWS role and credential variables are absent.

- [ ] **Step 2: Run tests and verify the localhost bypass is absent**

Run: `rtk pnpm nx test rule-runner-cli`, then `rtk pnpm nx test shared-http-request`.

Expected: FAIL because the current full-URL client path still resolves AWS configuration for localhost instead of reaching the controlled fixture without signing.

- [ ] **Step 3: Implement the signed call and narrow error logging**

```typescript
const response = await httpRequest(
  {
    baseURL: smaugUrl,
    data: request,
    method: 'POST',
    url: '/methodologies/dry-run/prepare-local-rule',
  },
  { credentials: provideSmaugApiCredentials() },
);
```

Use `baseURL` plus a relative path for both Smaug preparation methods so the existing localhost fixture boundary is reachable without AWS credentials. Parse the local response through a strict Zod schema. Log status and error code only; never serialize the Axios request/config object or any signed headers.

- [ ] **Step 4: Run focused project gates**

Run: `rtk pnpm nx run-many -t test ts lint -p rule-runner-cli,shared-http-request,shared-aws-http`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add tools/rule-runner-cli/src/utils/smaug-client.ts tools/rule-runner-cli/src/utils/smaug-client.spec.ts libs/shared/http-request
rtk git commit -m "fix(http-request): support local Smaug fixtures"
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
- Test: `tools/rule-runner-cli/src/commands/dry-run.command.spec.ts`
- Create: `tools/rule-runner-cli/src/commands/local-log-redaction.spec.ts`
- Create: `tools/rule-runner-cli/src/utils/local-result-output.ts`
- Modify: `libs/shared/helpers/src/logger.helpers.ts`

**Interfaces:**
- Consumes: Tasks 4-5 local module/client and existing registered preparation response.
- Produces: explicit command `pnpm run-rule dry-run <processor-path> --document-id <id> --data-set-name TEST`; the legacy registered processor-path plus methodology command and registered `--all-rules` command remain unchanged.

- [ ] **Step 1: Write failing local-mode and regression tests**

```typescript
it('should prepare and execute one explicit root-only processor', async () => {
  await handleDryRun(processorPath, localOptions);
  expect(smaug.prepareLocalRule).toHaveBeenCalledWith(expect.objectContaining({
    dataSetName: 'TEST', input: {}, rulesScope: 'MassID', ruleSlug,
  }));
  expect(Processor).toHaveBeenCalledTimes(1);
});

it.each(['methodologySlug', 'rulesScope', 'ruleSlug', 'allRules'] as const)(
  'should reject %s in explicit local mode',
  async (flag) => expect(runWithFlag(flag)).rejects.toThrow('cannot be used with an explicit processor path'),
);

it('should preserve the registered processor-path command', () => {
  expect(createDryRunSelection(processorPath, registeredOptions, command)).toEqual({
    allRules: false,
    methodologySlug: registeredOptions.methodologySlug,
    mode: 'registered',
    processorPath,
    ruleSlug: registeredOptions.ruleSlug,
    rulesScope: registeredOptions.rulesScope,
  });
});
```

Include `config` in the local forbidden-option table and reject `dataSetName` in registered mode. Add tests that nested input is forwarded unchanged; explicit processor exceptions reject; normal explicit local `FAILED` outputs set nonzero exit state; registered responses still execute their `rules` array; the registered path overrides automatic processor resolution; batch loads the local module once, constructs once per document, records errors, and sets nonzero exit state. Assert endpoint exclusivity explicitly: local mode never calls `prepareDryRun`, and registered mode never calls `prepareLocalRule`.

- [ ] **Step 2: Run rule-runner tests and verify the old mandatory methodology contract fails them**

Run: `rtk pnpm nx test rule-runner-cli`

Expected: FAIL because the current selection treats every supplied processor path as explicit local mode and rejects the legacy registered processor-path command.

- [ ] **Step 3: Implement an explicit discriminated mode**

```typescript
type DryRunSelection =
  | { dataSetName: DataSetName; mode: 'local'; processorPath: string }
  | { allRules: boolean; methodologySlug: string; mode: 'registered'; processorPath?: string; ruleSlug?: string; rulesScope: string };
```

Select local mode only when a processor path and `--data-set-name` are both present. A processor path plus `--methodology-slug` selects the legacy registered path; `--all-rules` selects registered discovery. Reject ambiguous or mixed flags and pass the discriminated selection to handlers. Local mode calls `prepareLocalRule`, builds one `RuleInput`, instantiates the processor per document, and lets exceptions reject. Registered mode keeps the existing preparation, optional processor-path override, and error-to-result behavior.

Make `--methodology-slug` conditionally required in registered mode. Use Commander's option-value source so the default `rulesScope: 'MassID'` does not count as an explicitly supplied forbidden flag in local mode.

- [ ] **Step 4: Run focused project gates**

Run: `rtk pnpm nx run-many -t test ts lint -p rule-runner-cli`

Expected: PASS, including registered regression tests.

- [ ] **Step 5: Commit**

```bash
rtk git add libs/shared/helpers/src/logger.helpers.ts tools/rule-runner-cli
rtk git commit -m "fix(rule-runner): preserve registered processor paths"
```

### Task 7: Document the Smaug-Only Runtime Boundary

**Files:**
- Modify: `README.md`
- Modify: `.ai/PROJECT_CONTEXT.md`
- Modify: `tools/rule-runner-cli/src/commands/dry-run.command.ts`
- Modify: `tools/rule-runner-cli/src/commands/dry-run.command.spec.ts`
- Regenerate: `AGENTS.md`
- Regenerate: `CLAUDE.md`

**Interfaces:**
- Consumes: the completed local-rule CLI flow.
- Produces: usage and architecture guidance that names Smaug as the only runtime API dependency.

- [ ] **Step 1: Add failing documentation and help assertions**

Assert the document argument help is exactly `MassID document ID`, the README contains separate local and registered processor-path examples, and the project context states that unbound execution retrieves and stages snapshots through Smaug without calling Palantir directly.

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
rtk git add README.md .ai/PROJECT_CONTEXT.md tools/rule-runner-cli AGENTS.md CLAUDE.md
rtk git commit -m "docs(rule-runner): define Smaug dry-run boundary"
```

### Task 8: Validate the Entire Changed Surface and Live CLI Boundary

**Files:**
- Verify only: every file changed on the feature branch

**Interfaces:**
- Consumes: the complete Methodology Rules implementation.
- Produces: exact-project gate evidence, local CLI evidence, and an explicit post-deployment production acceptance gate.

- [ ] **Step 1: Derive the exact changed projects without `nx affected`**

Map `rtk git diff --name-only origin/main...HEAD` to the nearest owning `project.json`. After the fail-closed bootstrap and explicit root-input corrections, the expected branch surface is 27 projects: nine application projects, seven BOLD rule-processor libraries, `rule-runner-cli`, and ten shared libraries. If the diff changes, use the newly derived set rather than this snapshot.

- [ ] **Step 2: Run all supported targets for the seven changed processor libraries**

Run `test`, `test-e2e`, `ts`, and `lint` for:

```text
methodologies-bold-rule-processors-mass-id-document-manifest-data
methodologies-bold-rule-processors-mass-id-geolocation-and-address-precision
methodologies-bold-rule-processors-mass-id-mass-id-sorting
methodologies-bold-rule-processors-mass-id-participant-accreditations-and-verifications-requirements
methodologies-bold-rule-processors-mass-id-prevented-emissions
methodologies-bold-rule-processors-mass-id-privacy-flags
methodologies-bold-rule-processors-mass-id-weighing
```

Use `rtk pnpm nx run-many -t test test-e2e ts lint -p <comma-separated-projects>`.

- [ ] **Step 3: Run `ts` and `lint` for the nine changed application projects**

Run those targets for the BOLD Carbon and BOLD Recycling application projects owning geolocation-and-address-precision, mass-id-sorting, participant-accreditations-and-verifications-requirements, prevented-emissions where present, and weighing. Derive their exact Nx names from their `project.json` files before invoking `run-many`.

- [ ] **Step 4: Run every supported gate for the eleven changed tool/shared projects**

Verify targets from each `project.json`, then run their supported combination of `test`, `ts`, and `lint` for `rule-runner-cli`, `shared-aws-http`, `shared-cli`, `shared-env`, `shared-helpers`, `shared-http-request`, `shared-lambda-wrapper`, `shared-methodologies-bold-io-helpers`, `shared-rule-result`, `shared-rule-types`, and `shared-testing`.

- [ ] **Step 5: Run repository-level generated, formatting, and diff checks**

Run `rtk pnpm nx format:check`, `rtk pnpm ai:check`, and `rtk git diff --check`.

- [ ] **Step 6: Run the active privacy scan over the complete branch delta**

Inspect `rtk git diff origin/main...HEAD --word-diff=porcelain` for proper nouns and production-like identifiers. Replace every third-party name or real identifier in docs, tests, fixtures, skills, comments, and commit messages with fictional data or placeholders.

- [ ] **Step 7: Exercise all CLI selections locally**

Create a disposable argument-free MassID processor fixture whose colocated rule definition declares `input: {}` under the repository's normal processor path and a localhost HTTP server that records requests and returns identifier-only preparation responses. With AWS credential variables absent, invoke the real `rtk pnpm run-rule dry-run` command for explicit local mode, the legacy registered processor-path mode, and registered `--all-rules` mode. Require successful execution, the expected local or registered preparation route and request body, one processor execution per returned rule, no audit-result route, and no STS/AWS access. Delete the disposable fixture after the run. Unit tests remain the exact-byte SigV4 proof because localhost intentionally bypasses signing.

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
