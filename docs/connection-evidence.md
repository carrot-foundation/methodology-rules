# Connection evidence

Contract for the `connection-evidence` object that Smaug freezes in the execution's S3 prefix before the rules run, and how the `waste-manager-connection` rule reads it. The Zod schema is the source of truth: `MassIDConnectionEvidenceSchema` in [`libs/shared/methodologies/bold/types/src/connection-evidence.types.ts`](../libs/shared/methodologies/bold/types/src/connection-evidence.types.ts); the key and the reader live in [`libs/shared/methodologies/bold/io-helpers/src/connection-evidence.helpers.ts`](../libs/shared/methodologies/bold/io-helpers/src/connection-evidence.helpers.ts).

## Producer and consumers

- **Producer**: Smaug's `prepare` step resolves, once per audited MassID, the MassID's Waste Generator against the history of its Waste Manager connections on the `Drop-off` day and the Waste Manager actors the integrator declared, then writes this object. Nothing else writes it, and no rule produces or updates it.
- **Consumers**: the `waste-manager-connection` rule (reads it from S3, never over HTTP), then certificate emission and the credit sale in Smaug, which reference the same object.

## Versions and rollout order

The current version is `2`. The schema accepts only that literal, so an object with any other `version` fails validation and the rule returns `FAILED`. Version `1`, which cannot express a connection end, is not accepted: a missing end is never read as an open period.

The schema is strict, so the consumer ships before the producer. Nothing writes version `1` and the rule is off, so version `2` replaces it directly. Any later change to the fields ships as a new `version` literal in this order:

1. Release the rule and the shared schema accepting both the current and the new version.
2. Make Smaug's emission and sale accept the new version, keeping every version their certificates were frozen with.
3. Only then make Smaug's `prepare` write the new version.
4. Drop the old version from the rule in a later release, once no execution still being audited carries it.

Certificates issued without connection evidence keep the policy they were issued under; this contract does not apply to them.

## S3 location

One object per execution document, in the same bucket (`DOCUMENT_BUCKET_NAME`) and prefix as the documents the rules load:

```text
{documentKeyPrefix}/{documentId}.connection-evidence.json
```

- `documentKeyPrefix` is the rule input's prefix (`[{executionNamespace}/]{executionId}/documents`).
- `documentId` is the execution document (the rule input's `documentId`, the MassID Audit), so the object sits next to `{documentId}.json`.
- The body is the bare JSON object below, without the `{ createdAt, document, id, versionDate }` envelope that documents use.

## Fields

| Field                            | Type                                 | Meaning                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `version`                        | `2`                                  | Contract version.                                                                                                                                                                                                        |
| `massId`                         | string                               | Id of the MassID document whose snapshot was audited (the rule input's `parentDocumentId`).                                                                                                                              |
| `documentId`                     | string                               | Id of the execution document the evidence was prepared for (the rule input's `documentId`).                                                                                                                              |
| `snapshotVersion`                | ISO date-time with offset            | `versionDate` of the MassID snapshot the evidence was resolved from. Carried for traceability; the rule does not check it.                                                                                               |
| `dropOffDate`                    | ISO date-time with offset, or `null` | `externalCreatedAt` of the MassID's `Drop-off` event; `null` when the MassID has no `Drop-off` event or more than one.                                                                                                   |
| `generatorPalantirParticipantId` | string, or `null`                    | Palantir participant id of the MassID's `Waste Generator` actor; `null` when the MassID has no `Waste Generator` actor or actors for more than one distinct participant.                                                 |
| `connectionHistory`              | `'complete'` \| `'incomplete'`       | `complete`: Smaug holds proven connection history for this generator, in this dataset, on the `Drop-off` day, so `wasteManagers` lists every applicable connection. `incomplete`: that coverage is missing or ambiguous. |
| `wasteManagers`                  | array                                | One entry per Waste Manager, unique by `palantirParticipantId`. Empty when there is nothing to report; an empty list proves no connection only when `connectionHistory` is `complete`.                                   |
| `policyVersion`                  | string                               | Version of the distribution policy the eligibility was computed under.                                                                                                                                                   |
| `preparedAt`                     | ISO date-time with offset            | When Smaug prepared the evidence. Provenance only: it does not prove the connection still holds, and it never replaces the `Drop-off` day.                                                                               |

### Waste Manager entries

| Field                   | Type                                         | Meaning                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `palantirParticipantId` | string                                       | Palantir participant id of the Waste Manager.                                                                                                                                                                                     |
| `source`                | `'integrator'` \| `'connection'` \| `'both'` | `integrator`: declared as a `Waste Manager` actor in the MassID, with no confirmed connection. `connection`: confirmed connection with the generator, no actor in the MassID. `both`: declared actor with a confirmed connection. |
| `relationId`            | string                                       | Id of the confirmed connection. Required when `source` is `connection` or `both`, rejected otherwise.                                                                                                                             |
| `revision`              | positive integer                             | Revision of the connection the period was read from. Same presence rule as `relationId`.                                                                                                                                          |
| `confirmedStartDate`    | ISO date `YYYY-MM-DD`                        | First civil day of the connection, inclusive. Same presence rule as `relationId`.                                                                                                                                                 |
| `effectiveEndDate`      | ISO date `YYYY-MM-DD`, or `null`             | First civil day without the connection, exclusive. `null`: a confirmed period with no end recorded. Same presence rule as `relationId`, and the key is required: a missing key is invalid, not `null`.                            |
| `eligibility`           | `'eligible'` \| `'ineligible'` \| `'review'` | Smaug's verdict for this Waste Manager under `policyVersion`. An `integrator` entry is never `eligible`.                                                                                                                          |
| `reason`                | kebab-case code, optional                    | Code explaining Smaug's verdict, such as `connection-ended-before-drop-off`: lowercase words joined by single hyphens, at most 64 characters.                                                                                     |

### Connection period

Both dates are civil days in `America/Sao_Paulo`. A MassID is in the period when `confirmedStartDate <= Drop-off day < effectiveEndDate`; with `effectiveEndDate: null` only the start applies. The `Drop-off` day is the civil day of `Drop-off.externalCreatedAt` in `America/Sao_Paulo`, never the UTC date.

For a connection from `2026-10-01` with `effectiveEndDate: "2026-10-20"`:

| `Drop-off` instant         | Day in `America/Sao_Paulo` | In the period |
| -------------------------- | -------------------------- | ------------- |
| `2026-10-01T02:59:59.999Z` | `2026-09-30`               | no            |
| `2026-10-01T03:00:00.000Z` | `2026-10-01`               | yes           |
| `2026-10-19T15:00:00.000Z` | `2026-10-19`               | yes           |
| `2026-10-20T02:59:59.999Z` | `2026-10-19`               | yes           |
| `2026-10-20T03:00:00.000Z` | `2026-10-20`               | no            |
| `2026-10-21T02:30:00.000Z` | `2026-10-20`               | no            |

- A closure requested today takes `effectiveEndDate` = today, so it also removes the `Drop-off`s earlier that same day.
- A closure scheduled for a future day keeps every `Drop-off` before that day in the period.
- An `effectiveEndDate` on or before `confirmedStartDate`, such as a future start closed before it began, is a valid empty period: no `Drop-off` falls in it.
- The technical instant of a revocation (`revokedAt`) is not an `effectiveEndDate`. A corrective revocation without a civil end goes out as `eligibility: 'review'` with a `reason`; Smaug never invents an end for it.

### Invariants the schema enforces

- `version` is `2`, and `connectionHistory` is present.
- `palantirParticipantId` is unique across `wasteManagers`.
- `connection` and `both` entries carry `relationId`, a positive `revision`, `confirmedStartDate` and `effectiveEndDate` (a real calendar day or `null`); `integrator` entries carry none of them and cannot be `eligible`.
- Any `connection` or `both` entry requires a non-null `generatorPalantirParticipantId`.
- `reason` is a code, not prose, so no free text reaches the object.
- The object and its entries are strict: a field outside this contract fails validation instead of being dropped.

### Examples

A declared Waste Manager in force with no end recorded, a connection closed before the `Drop-off`, and a connection whose closure is scheduled after it:

```json
{
  "version": 2,
  "massId": "<massid-document-id>",
  "documentId": "<execution-document-id>",
  "snapshotVersion": "2026-10-09T17:00:00.000Z",
  "dropOffDate": "2026-10-09T15:00:00.000Z",
  "generatorPalantirParticipantId": "<generator-participant-id>",
  "connectionHistory": "complete",
  "wasteManagers": [
    {
      "palantirParticipantId": "<declared-manager-participant-id>",
      "source": "both",
      "relationId": "<relation-id>",
      "revision": 2,
      "confirmedStartDate": "2026-10-01",
      "effectiveEndDate": null,
      "eligibility": "eligible"
    },
    {
      "palantirParticipantId": "<former-manager-participant-id>",
      "source": "connection",
      "relationId": "<relation-id>",
      "revision": 3,
      "confirmedStartDate": "2026-09-01",
      "effectiveEndDate": "2026-10-09",
      "eligibility": "ineligible",
      "reason": "connection-ended-before-drop-off"
    },
    {
      "palantirParticipantId": "<connected-manager-participant-id>",
      "source": "connection",
      "relationId": "<relation-id>",
      "revision": 2,
      "confirmedStartDate": "2026-10-05",
      "effectiveEndDate": "2026-11-19",
      "eligibility": "eligible"
    }
  ],
  "policyVersion": "<distribution-policy-version>",
  "preparedAt": "2026-10-09T18:00:00.000Z"
}
```

A MassID whose generator has no proven history on the `Drop-off` day: the empty list proves nothing, and the rule sends it to review.

```json
{
  "version": 2,
  "massId": "<massid-document-id>",
  "documentId": "<execution-document-id>",
  "snapshotVersion": "2026-10-09T17:00:00.000Z",
  "dropOffDate": "2026-10-09T15:00:00.000Z",
  "generatorPalantirParticipantId": "<generator-participant-id>",
  "connectionHistory": "incomplete",
  "wasteManagers": [],
  "policyVersion": "<distribution-policy-version>",
  "preparedAt": "2026-10-09T18:00:00.000Z"
}
```

### What Smaug decides

Smaug writes the verdict; the rule checks it against the MassID and recomputes the period of every `eligible` entry as a guard.

- `wasteManagers` holds one entry for every `Waste Manager` actor declared in the MassID and one for every Waste Manager whose connection with the generator applies to the `Drop-off` day, merged into a single `both` entry when they are the same participant. Connections that are closed today but were in force on the `Drop-off` day are included.
- Smaug selects the current revision of each relation before applying the period, so an old revision that was still open cannot come back. Successive relations between the same parties never produce two entries for one Waste Manager; overlapping or conflicting periods make the entry `review`.
- An entry is `eligible` only when its connection is confirmed under `policyVersion` and the `Drop-off` day is in its period. A period that starts after the `Drop-off`, one that ended on or before it, or a MassID without a single `Drop-off`, makes the entry `ineligible` with a `reason`.
- `connectionHistory` comes from the coverage Smaug has proven for this generator in this dataset. The date a history record was created does not prove coverage before it, and the absence of a generator in one dataset proves nothing about another.
- When `generatorPalantirParticipantId` is `null` no connection can apply, so Smaug writes no `connection` entry and `connectionHistory: 'complete'`. When `dropOffDate` is `null`, no day can be compared: Smaug lists the generator's connections as `ineligible`, and `connectionHistory` reports whether its history covers that generator at all. The rules that check the generator and the `Drop-off` own those defects.
- `review` is for cases Smaug cannot settle on its own; the rule sends them to human review.
- Smaug keeps the generator's eligibility revision and its coverage reference in its own execution record, next to the evidence key and hash, and compares them at emission. They are not part of this object.
- When the rule passes, the beneficiaries are exactly the `eligible` entries of this object: `both` entries as declared actors and `connection` entries as derived beneficiaries. Emission reads them from the evidence it references, not from the rule's `resultContent`.

### Privacy

Internal ids only. The object carries no tax id, name, e-mail, address or coordinate of any participant, and `reason` cannot hold prose. Internal ids still link to participants, so the object is not anonymous.

## How the rule decides

The rule loads the MassID (`parentDocumentId`) and the evidence, then compares the evidence with the MassID before deciding anything. Each Waste Manager is decided on its own, and the eligibility of one never covers another; the rule status is the most severe decision, and `resultContent` lists `connectionHistory`, `policyVersion` and every decision with its reason in `wasteManagers`.

| Situation                                                                                                                                                               | Status                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Evidence missing (`NoSuchKey`)                                                                                                                                          | `FAILED`                                    |
| Evidence is not JSON or fails the schema, including any `version` other than `2`                                                                                        | `FAILED`                                    |
| Evidence does not match the audited MassID: `documentId`, `massId`, generator, `dropOffDate`, or an entry's `source` disagrees with the MassID's `Waste Manager` actors | `FAILED`                                    |
| `connectionHistory` is `incomplete`                                                                                                                                     | `REVIEW_REQUIRED`                           |
| Declared `Waste Manager` actor without an `eligible` entry                                                                                                              | `REVIEW_REQUIRED`                           |
| `eligible` entry whose `confirmedStartDate` is after the `Drop-off` day (Smaug broke the timing policy)                                                                 | `REVIEW_REQUIRED`                           |
| `eligible` entry whose `effectiveEndDate` is on or before the `Drop-off` day, including an empty period (Smaug broke the timing policy)                                 | `REVIEW_REQUIRED`                           |
| `eligible` entry on a MassID without a single `Drop-off` event (Smaug broke the timing policy)                                                                          | `REVIEW_REQUIRED`                           |
| `connection` entry with `eligibility: 'review'`                                                                                                                         | `REVIEW_REQUIRED`                           |
| Declared actor with an eligible connection whose period contains the `Drop-off` day                                                                                     | `PASSED`                                    |
| `eligible` `connection` entry without an actor in the MassID                                                                                                            | `PASSED`, recorded as a derived beneficiary |
| `connection` entry with `eligibility: 'ineligible'`                                                                                                                     | Excluded, recorded in `resultContent`       |
| No `Waste Manager` actor and no eligible connection, with `connectionHistory: 'complete'`                                                                               | `PASSED`, not applicable                    |

Read failures other than `NoSuchKey` (throttling, `AccessDenied`) propagate as execution errors. Without `s3:ListBucket` on the bucket, S3 answers a missing key with `AccessDenied`, so a missing evidence fails the execution instead of returning the `FAILED` result above; it never passes.

## Activation

The rule is registered and off: the library exists and is tested, but no methodology lists it in its `rulesConfig` and no Lambda application under `apps/` wraps it, so nothing builds or deploys it. Turning it on is a methodology decision that ships with the distribution policy version that accepts derived beneficiaries.

Prerequisites. The rule does not go on while any of them is missing:

1. Smaug's `prepare` writes this object, at `version` `2`, in production for every MassID audited by the target methodology, including those without Waste Managers, with `connectionHistory` taken from proven coverage per generator and dataset. The rule fails every MassID whose evidence is missing.
2. Smaug's rule-result endpoint accepts `REVIEW_REQUIRED` from this rule and routes it to human review. The rule's Lambda opts in with `wrapRuleIntoLambdaHandler(instance, { reportsReviewRequired: true })`, so it reports `REVIEW_REQUIRED` unchanged; every other rule keeps the default of `libs/shared/lambda/wrapper/src/lambda-wrapper.ts`, which reports it as `FAILED`.
3. The distribution policy version that adopts this rule is published; it is the `policyVersion` Smaug writes.
4. The rule's Lambda role reads the evidence key in `DOCUMENT_BUCKET_NAME` and has `s3:ListBucket` on it.

Steps, per methodology (`bold-carbon`, `bold-recycling`):

1. Add a methodology framework rule for the Waste Manager connection to `libs/methodologies/<methodology>/rules/src/methodology-framework-rules.ts`, with its methodology reference.
2. Create `apps/methodologies/<methodology>/rule-processors/mass-id/waste-manager-connection/`, mirroring an existing rule application such as `waste-origin-identification`: `project.json`, `src/lambda.ts` re-exporting `wasteManagerConnectionLambda` as `handler`, and `src/rule-definition.ts` extending the base `ruleDefinition` with that framework rule slug.
3. Add `'waste-manager-connection'` to `rulesConfig['mass-id']` in `libs/methodologies/<methodology>/rules/src/rules.config.ts`.
4. Run `pnpm generate:readmes`, `pnpm generate:methodology-readmes` and `pnpm generate:manifest`, then `pnpm bump:applications`.
5. Deploy through the regular pipeline, then enable the rule for the methodology in Smaug once `prepare` writes this object for every MassID of that methodology.

Turning it off again is removing the slug from `rulesConfig` and releasing a new methodology application version.
