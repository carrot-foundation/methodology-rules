# Connection evidence

Contract for the `connection-evidence` object that Smaug freezes in the execution's S3 prefix before the rules run, and how the `waste-manager-connection` rule reads it. The Zod schema is the source of truth: `MassIDConnectionEvidenceSchema` in [`libs/shared/methodologies/bold/types/src/connection-evidence.types.ts`](../libs/shared/methodologies/bold/types/src/connection-evidence.types.ts); the key and the reader live in [`libs/shared/methodologies/bold/io-helpers/src/connection-evidence.helpers.ts`](../libs/shared/methodologies/bold/io-helpers/src/connection-evidence.helpers.ts).

## Producer and consumers

- **Producer**: Smaug's `prepare` step resolves, once per audited MassID, the MassID's Waste Generator against the confirmed Waste Manager connections and the Waste Manager actors the integrator declared, then writes this object. Nothing else writes it, and no rule produces or updates it.
- **Consumers**: the `waste-manager-connection` rule (reads it from S3, never over HTTP), then certificate emission and the credit sale in Smaug, which reference the same object.

## S3 location

One object per execution document, in the same bucket (`DOCUMENT_BUCKET_NAME`) and prefix as the documents the rules load:

```text
{documentKeyPrefix}/{documentId}.connection-evidence.json
```

- `documentKeyPrefix` is the rule input's prefix (`[{executionNamespace}/]{executionId}/documents`).
- `documentId` is the execution document (the rule input's `documentId`, the MassID Audit), so the object sits next to `{documentId}.json`.
- The body is the bare JSON object below, without the `{ createdAt, document, id, versionDate }` envelope that documents use.

## Fields

| Field                            | Type                                 | Meaning                                                                                                                                  |
| -------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                        | `1`                                  | Contract version. A breaking change ships a new literal and a new schema.                                                                |
| `massId`                         | string                               | Id of the MassID document whose snapshot was audited (the rule input's `parentDocumentId`).                                              |
| `documentId`                     | string                               | Id of the execution document the evidence was prepared for (the rule input's `documentId`).                                              |
| `snapshotVersion`                | ISO date-time with offset            | `versionDate` of the MassID snapshot the evidence was resolved from.                                                                     |
| `dropOffDate`                    | ISO date-time with offset, or `null` | `externalCreatedAt` of the MassID's `Drop-off` event; `null` when the MassID has no `Drop-off` event or more than one.                   |
| `generatorPalantirParticipantId` | string, or `null`                    | Palantir participant id of the MassID's `Waste Generator` actor; `null` when the MassID has no `Waste Generator` actor or more than one. |
| `wasteManagers`                  | array                                | One entry per Waste Manager, unique by `palantirParticipantId`. Empty when there is nothing to report.                                   |
| `policyVersion`                  | string                               | Version of the distribution policy the eligibility was computed under.                                                                   |
| `preparedAt`                     | ISO date-time with offset            | When Smaug prepared the evidence.                                                                                                        |

### Waste Manager entries

| Field                   | Type                                         | Meaning                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `palantirParticipantId` | string                                       | Palantir participant id of the Waste Manager.                                                                                                                                                                                     |
| `source`                | `'integrator'` \| `'connection'` \| `'both'` | `integrator`: declared as a `Waste Manager` actor in the MassID, with no confirmed connection. `connection`: confirmed connection with the generator, no actor in the MassID. `both`: declared actor with a confirmed connection. |
| `relationId`            | string                                       | Id of the confirmed connection. Required when `source` is `connection` or `both`, absent otherwise.                                                                                                                               |
| `revision`              | non-negative integer                         | Revision of the connection the eligibility was read from. Same presence rule as `relationId`.                                                                                                                                     |
| `confirmedStartDate`    | ISO date `YYYY-MM-DD`                        | Civil start day of the confirmed connection. Same presence rule as `relationId`.                                                                                                                                                  |
| `eligibility`           | `'eligible'` \| `'ineligible'` \| `'review'` | Smaug's verdict for this Waste Manager under `policyVersion`. An `integrator` entry is never `eligible`.                                                                                                                          |
| `reason`                | kebab-case code, optional                    | Why the entry is not `eligible`, as a code such as `connection-start-after-drop-off`.                                                                                                                                             |

### Invariants the schema enforces

- `palantirParticipantId` is unique across `wasteManagers`.
- `connection` and `both` entries carry `relationId`, `revision` and `confirmedStartDate`; `integrator` entries cannot be `eligible`.
- Any `connection` or `both` entry requires a non-null `generatorPalantirParticipantId`.
- `reason` is a code, not prose, so no free text reaches the object.

### Privacy

Internal ids only. The object carries no tax id, name, e-mail, address or coordinate of any participant, and `reason` cannot hold prose.

## How the rule decides

The rule loads the MassID (`parentDocumentId`) and the evidence, then compares the evidence with the MassID before deciding anything. Each Waste Manager is decided on its own; the rule status is the most severe decision, and `resultContent.wasteManagers` lists every decision with its reason.

| Situation                                                                                                                                                               | Status                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Evidence missing (`NoSuchKey`)                                                                                                                                          | `FAILED`                                    |
| Evidence is not JSON or fails the schema                                                                                                                                | `FAILED`                                    |
| Evidence does not match the audited MassID: `documentId`, `massId`, generator, `dropOffDate`, or an entry's `source` disagrees with the MassID's `Waste Manager` actors | `FAILED`                                    |
| Declared `Waste Manager` actor without an `eligible` entry                                                                                                              | `REVIEW_REQUIRED`                           |
| Eligible connection whose `confirmedStartDate` is after the `Drop-off` day                                                                                              | `REVIEW_REQUIRED`                           |
| Eligible connection on a MassID without a single `Drop-off` event                                                                                                       | `REVIEW_REQUIRED`                           |
| `connection` entry with `eligibility: 'review'`                                                                                                                         | `REVIEW_REQUIRED`                           |
| Declared actor with an eligible connection that started on or before the `Drop-off` day                                                                                 | `PASSED`                                    |
| `eligible` `connection` entry without an actor in the MassID                                                                                                            | `PASSED`, recorded as a derived beneficiary |
| `connection` entry with `eligibility: 'ineligible'`                                                                                                                     | Excluded, recorded in `resultContent`       |
| No `Waste Manager` actor and no eligible connection                                                                                                                     | `PASSED`, not applicable                    |

The `Drop-off` day is the civil day of `Drop-off.externalCreatedAt` in `America/Sao_Paulo`. A connection is in force from 00:00 of `confirmedStartDate` in that timezone, inclusive: a `Drop-off` at `2026-10-09T00:00:00-03:00` meets a connection confirmed from `2026-10-09`, and one at `2026-10-09T02:59:59Z` does not.

Read failures other than `NoSuchKey` (throttling, `AccessDenied`) propagate as execution errors. Without `s3:ListBucket` on the bucket, S3 answers a missing key with `AccessDenied`, so a missing evidence fails the execution instead of returning the `FAILED` result above; it never passes.

## Activation

The rule is registered and off: the library exists and is tested, but no methodology lists it in its `rulesConfig` and no Lambda application under `apps/` wraps it, so nothing builds or deploys it. Turning it on is a methodology decision that ships with the distribution policy version that accepts derived beneficiaries.

Prerequisites. The rule does not go on while any of them is missing:

1. Smaug's `prepare` writes this object in production for every MassID audited by the target methodology, including those without Waste Managers. The rule fails every MassID whose evidence is missing.
2. The Lambda wrapper reports `REVIEW_REQUIRED` to Smaug as `REVIEW_REQUIRED`. Today `toUpstreamCompatibleOutput` in `libs/shared/lambda/wrapper/src/lambda-wrapper.ts` turns it into `FAILED`, which would turn every human-review case of this rule into a failure.
3. The distribution policy version that adopts this rule is published; it is the `policyVersion` Smaug writes.
4. The rule's Lambda role reads the evidence key in `DOCUMENT_BUCKET_NAME` and has `s3:ListBucket` on it.

Steps, per methodology (`bold-carbon`, `bold-recycling`):

1. Add a methodology framework rule for the Waste Manager connection to `libs/methodologies/<methodology>/rules/src/methodology-framework-rules.ts`, with its methodology reference.
2. Create `apps/methodologies/<methodology>/rule-processors/mass-id/waste-manager-connection/`, mirroring an existing rule application such as `waste-origin-identification`: `project.json`, `src/lambda.ts` re-exporting `wasteManagerConnectionLambda` as `handler`, and `src/rule-definition.ts` extending the base `ruleDefinition` with that framework rule slug.
3. Add `'waste-manager-connection'` to `rulesConfig['mass-id']` in `libs/methodologies/<methodology>/rules/src/rules.config.ts`.
4. Run `pnpm generate:readmes`, `pnpm generate:methodology-readmes` and `pnpm generate:manifest`, then `pnpm bump:applications`.
5. Deploy through the regular pipeline and enable the rule for the methodology in Smaug together with its evidence flag.

Turning it off again is removing the slug from `rulesConfig` and releasing a new methodology application version.
