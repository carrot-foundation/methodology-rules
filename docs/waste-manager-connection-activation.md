# Waste Manager connection activation

Release runbook for turning on the `waste-manager-connection` rule with the [distribution policy version](./rewards-distribution-policy.md) that adopts it. It lists the configuration per environment, the changes the activation release makes, the publication sequence, the checks for each environment, when to stop, and how to roll back. Running any step needs the environment chosen and the operational authority for it; a merged or ready pull request proves neither an active rule nor a published policy.

## Configuration

| Component                         | Current                                                                                    | Proposed                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Rule library                      | `libs/methodologies/bold/rule-processors/mass-id/waste-manager-connection`, tested, unused | Unchanged                                                                              |
| Rule application, per methodology | None under `apps/methodologies/<methodology>/rule-processors/mass-id/`                     | `waste-manager-connection/`, from the activation release                               |
| Framework rule, per methodology   | No Waste Manager connection entry in `methodology-framework-rules.ts`                      | `waste-manager-connection-verified`                                                    |
| `rulesConfig['mass-id']`          | Without `waste-manager-connection` in `bold-carbon` and `bold-recycling`                   | With it                                                                                |
| Application version               | `1.0.0` in both, no `methodology-application/*` tag                                        | The version the activation release tags                                                |
| Lambda artifacts                  | Not built                                                                                  | Uploaded by `.github/workflows/deploy.yaml` after the activation merge                 |
| Smaug evidence production         | `prepare` does not write `connection-evidence`                                             | Writes version `2`, with this `policyVersion`, for every audited MassID of the dataset |
| Smaug methodology, per dataset    | Its stored `rules` do not include the rule                                                 | Includes it for the chosen dataset and environment                                     |

A merge to `main` that touches a rule application uploads its Lambda and a `rules-metadata-<checksum>.json` to `elrond-<environment>-methodology-rules-metadata-lambda-artifacts` for **production and development in the same run**: `deploy.yaml` runs one matrix over both, with `continue-on-error`, so one environment can fail while the other succeeds. This repository has no development-only path. An uploaded Lambda stays unused until a Smaug methodology lists the rule, so the choice of environment and dataset happens in Smaug. Smaug stores a methodology's `rules` when the methodology is created; changing them on an existing methodology is a Smaug migration with its own release.

## Activation release

The activation pull request changes, for `bold-carbon` and `bold-recycling`:

- `libs/methodologies/<methodology>/rules/src/methodology-framework-rules.ts`: adds the `waste-manager-connection-verified` framework rule.
- `apps/methodologies/<methodology>/rule-processors/mass-id/waste-manager-connection/`: the rule application, mirroring `waste-origin-identification`. `src/lambda.ts` re-exports `wasteManagerConnectionLambda` as `handler`; `src/rule-definition.ts` extends the base rule definition with `waste-manager-connection-verified`.
- `libs/methodologies/<methodology>/rules/src/rules.config.ts`: adds `waste-manager-connection` to `rulesConfig['mass-id']`.
- The generated README of each rule application and the `codecov.yml` flags.

The version, tags and methodology READMEs come from `version-and-sync.yaml` after the merge; the pull request does not run `bump:rules` or `bump:applications`.

## Sequence

Each step starts only after the previous one is verified in the target environment.

1. **Compatible components.** Merge this repository's contract and rule library (nothing is deployed, since no rule application exists yet). Deploy the Smaug releases whose emission, sale, recovery and replay read `connection-evidence` version `2` and whose rule-result endpoint accepts `REVIEW_REQUIRED` from this rule.
2. **Identifier.** With the baseline tag in place, merge the activation pull request. Read the tag `methodology-application/<methodology>@<version>` that `version-and-sync.yaml` creates and record `<methodology>@<version>` in the [policy artifact](./rewards-distribution-policy.md). The uploaded Lambdas stay unused.
3. **Effective preparation.** Smaug's `prepare` writes the evidence with that `policyVersion` for every MassID of the target dataset, and the checks below pass. The rule is still off, and no emission is admitted under this version yet.
4. **Versioned policy.** Smaug's emission and sale accept this `policyVersion` for the target dataset.
5. **Rule on.** Smaug adds the rule to the methodology of the target dataset and environment, in the environment order that was chosen.
6. **Effective behavior.** Run the checks for the environment before moving to the next one.

## Checks per environment

All checks read state; none of them changes it.

- That environment's deploy job succeeded, and its `rules-metadata-<checksum>.json` lists the `waste-manager-connection` Lambda of each methodology with the commit of the activation merge.
- The Lambda role reads `{documentKeyPrefix}/{documentId}.connection-evidence.json` in `DOCUMENT_BUCKET_NAME` and has `s3:ListBucket` on that bucket.
- For a sample of executions audited after step 3, every MassID has an evidence object that parses as version `2`, carries the `policyVersion` recorded in step 2, and has `connectionHistory` from proven coverage.
- The Smaug methodology lists the rule only for the dataset that was chosen.
- Rule results for the sample carry `PASSED`, `REVIEW_REQUIRED` or `FAILED` as described in the [contract](./connection-evidence.md#how-the-rule-decides), and `REVIEW_REQUIRED` reaches human review instead of being stored as `FAILED`.
- Certificates issued after step 5 reference the evidence and its hash and carry this `policyVersion`; certificates issued before keep their earlier policy.

## Interruption conditions

Stop, and roll back what was already turned on, when any of these holds:

- The activation merge produced no new application version, so `policyVersion` would equal the version in force. This is the outcome while no baseline tag exists.
- Any MassID audited by the methodology lacks its evidence, or its evidence does not parse as version `2`.
- An evidence object carries a `policyVersion` other than the one recorded in the policy artifact.
- `connectionHistory` is `incomplete` for most MassIDs of the dataset. That means coverage is missing, not that the dataset has no connections.
- Smaug stores this rule's `REVIEW_REQUIRED` as `FAILED`, or rejects it.
- A certificate under this version lacks its evidence reference or its frozen beneficiaries.
- An environment's checks did not all pass before the next environment starts.

## Rollback

Rollback stops new entries under this version and keeps everything already produced under it.

1. **Stop new entries in Smaug.** Smaug's migration removes the rule from the methodology for new executions, `prepare` stops writing this `policyVersion`, and emission stops admitting new emissions under it. The migration has its own release, so this is not an instant switch.
2. **Finish what already started.** An emission already admitted, reserved or externally committed under this version is completed or recovered under it, never re-evaluated under another policy. A MassID audited under this version but not yet emitted is not emitted under it; it is prepared and audited again under the policy in force.
3. **Keep the readers.** The Smaug components from step 1 stay deployed, so certificates issued under this version can still be sold and replayed.
4. **Keep the evidence.** Do not delete `connection-evidence` objects, rule results, pending emission operations, or the inputs persisted with signed computations.
5. **Keep issued certificates.** Certificates issued under this version keep their beneficiaries, evidence reference and `policyVersion`. They are sold and replayed under it and never treated as certificates of the earlier policy.
6. **Remove the rule from the release.** In this repository, remove the slug from `rulesConfig['mass-id']` and the `waste-manager-connection-verified` framework rule. Removing the framework rule is what the release flow counts, as a major version, once a tag exists; removing only the slug produces no new version. The uploaded Lambdas and earlier releases stay as they are.

## Owners

| Step                                                                 | Owner                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Choice of environment, dataset and environment order                 | Product decision, before any step                               |
| Baseline tag, steps 1 and 2, and step 6 of the rollback in this repo | Methodology rules maintainers, through the regular release flow |
| Smaug releases, steps 3 to 5, and steps 1 to 3 of the rollback       | Smaug maintainers, with Smaug's own releases and migrations     |
| Lambda role permissions on `DOCUMENT_BUCKET_NAME`                    | Infrastructure owners of the rule Lambdas                       |
| Checks and the decision to continue or roll back                     | Operations, with the operational authority for that environment |
