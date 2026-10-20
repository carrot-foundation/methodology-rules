# Waste Manager connection activation

Release runbook for turning on the `waste-manager-connection` rule with the [distribution policy version](./rewards-distribution-policy.md) that adopts it. It lists the configuration per environment, the publication sequence, the checks for each environment, when to stop, and how to roll back. Running any step needs the environment chosen and the operational authority for it; a merged or ready pull request proves neither an active rule nor a published policy.

## Configuration

| Component                         | Current                                                                                    | Proposed                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Rule library                      | `libs/methodologies/bold/rule-processors/mass-id/waste-manager-connection`, tested, unused | Unchanged                                                                  |
| Rule application, per methodology | None under `apps/methodologies/<methodology>/rule-processors/mass-id/`                     | `waste-manager-connection/` application, as in the activation pull request |
| Framework rule, per methodology   | No Waste Manager connection entry in `methodology-framework-rules.ts`                      | One entry, with its methodology reference                                  |
| `rulesConfig['mass-id']`          | Without `waste-manager-connection` in `bold-carbon` and `bold-recycling`                   | With it                                                                    |
| Lambda artifacts                  | Not built                                                                                  | Uploaded by `.github/workflows/deploy.yaml` after the merge to `main`      |
| Smaug methodology, per dataset    | Its stored `rules` do not include the rule                                                 | Includes it, enabled by Smaug for the chosen dataset and environment       |
| Smaug evidence production         | `prepare` does not write `connection-evidence`                                             | Writes version `2` for every audited MassID of the methodology             |

A merge to `main` uploads the Lambda artifacts and `rules-metadata.json` to **production and development at once**: `deploy.yaml` runs one matrix over both environments. This repository has no development-only path. An uploaded Lambda stays unused until a Smaug methodology lists the rule, so choosing an environment happens in Smaug: methodology documents store their `rules` when created, and a stored methodology needs Smaug's own migration to change them.

## Sequence

Each step starts only after the previous one is verified in the target environment.

1. **Compatible components.** Deploy this repository's contract and rule (the rule still off) and the Smaug releases that read `connection-evidence` version `2` at emission and sale and accept `REVIEW_REQUIRED` from this rule.
2. **Effective preparation.** Enable Smaug's `prepare` to write the evidence in the target environment, and verify it as described below. The rule fails every MassID whose evidence is missing, so it cannot go on before this.
3. **Versioned policy.** Merge the activation pull request. Read the tag `.github/workflows/version-and-sync.yaml` creates, `methodology-application/<methodology>@<version>`, and record `<methodology>@<version>` in the [policy artifact](./rewards-distribution-policy.md). Configure Smaug to write that `policyVersion`.
4. **Rule on.** Smaug adds the rule to the methodology of the target dataset and environment, development first.
5. **Effective behavior.** Run the checks for the environment before moving to the next one.

## Checks per environment

All checks read state; none of them changes it.

- The Lambda for `waste-manager-connection` exists in that environment's artifact bucket and in its `rules-metadata.json`, with the commit of the activation release.
- The Lambda role reads `{documentKeyPrefix}/{documentId}.connection-evidence.json` in `DOCUMENT_BUCKET_NAME` and has `s3:ListBucket` on that bucket.
- For a sample of executions audited after step 2, every MassID has an evidence object that parses as version `2`, with the `policyVersion` from step 3 and `connectionHistory` from proven coverage.
- The Smaug methodology for the dataset lists the rule, and only for the dataset that was chosen.
- Rule results for that sample carry `PASSED`, `REVIEW_REQUIRED` or `FAILED` as described in the [contract](./connection-evidence.md#how-the-rule-decides), and `REVIEW_REQUIRED` reaches human review instead of being stored as `FAILED`.
- Certificates issued after activation reference the evidence and its hash, and certificates issued before keep their earlier policy.

## Interruption conditions

Stop, and roll back what was already turned on, when any of these holds:

- The activation merge produced no new application version, so `policyVersion` would equal the version in force. Without a `methodology-application/*` tag, `bump:applications` does not count the added framework rule as a change. Resolve the version through the release flow first; never write the identifier by hand.
- Any MassID audited by the methodology lacks its evidence, or its evidence does not parse as version `2`.
- `connectionHistory` is `incomplete` for most MassIDs of the dataset. That means coverage is missing, not that the dataset has no connections.
- Smaug stores this rule's `REVIEW_REQUIRED` as `FAILED`, or rejects it.
- A certificate under this version lacks its evidence reference or its frozen beneficiaries.
- The development checks did not all pass before production.

## Rollback

Rollback stops new entries under this version and keeps everything already produced under it.

1. **Stop new entries.** Smaug removes the rule from the methodology for new executions and stops admitting new emissions under this `policyVersion`. Executions already admitted finish under the version they started with.
2. **Remove the rule from the release.** In this repository, remove `waste-manager-connection` from `rulesConfig['mass-id']` and release a new application version through the same flow. The uploaded Lambda and earlier releases stay as they are.
3. **Keep the evidence.** Do not delete `connection-evidence` objects, rule results, pending emission operations, or the inputs persisted with signed computations.
4. **Keep issued certificates.** Certificates issued under this version keep their beneficiaries, evidence reference and `policyVersion`, and replay from their persisted inputs. Never treat them as certificates of the earlier policy.

## Owners

| Step                                                      | Owner                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Choice of environment and dataset                         | Product decision, before any step                               |
| Steps 1 and 3 in this repository                          | Methodology rules maintainers, through the regular release flow |
| Steps 1, 2 and 4 in Smaug, and the per-dataset enablement | Smaug maintainers, with Smaug's own release and migration       |
| Checks and the decision to continue or roll back          | Operations, with the operational authority for that environment |
