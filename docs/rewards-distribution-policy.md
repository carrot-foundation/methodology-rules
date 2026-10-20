# Rewards distribution policy with connected Waste Managers

Release artifact for the distribution policy version that pays a Waste Manager from the connection evidence instead of from the declared actor alone. It names the version Smaug writes as `policyVersion`, what that version changes, and the separate references it depends on. Status: **proposed, not published**. Nothing in this repository applies it; activation follows [Waste Manager connection activation](./waste-manager-connection-activation.md).

## Identifier

`policyVersion` is the methodology application release that adopts the `waste-manager-connection` rule:

```text
<methodology>@<application version>
```

| Methodology      | `policyVersion`                                       |
| ---------------- | ----------------------------------------------------- |
| `bold-carbon`    | `bold-carbon@<filled from the activation release>`    |
| `bold-recycling` | `bold-recycling@<filled from the activation release>` |

The version is the one the existing release flow assigns when the activation pull request merges: `.github/workflows/version-and-sync.yaml` runs `pnpm bump:applications`, writes `version` in `libs/methodologies/<methodology>/rules/src/methodology-application.config.ts`, and tags `methodology-application/<methodology>@<version>`. Fill the table from that tag; never pick a number by hand.

The identifier must differ from the application version in force when the rule is off. Both applications are at `1.0.0` and no `methodology-application/*` tag exists yet. Without a tag, `bump:applications` does not count an added framework rule as a change, so the activation merge alone may leave the version at `1.0.0`. That outcome stops the activation; see the runbook's interruption conditions.

## What this version changes

Under the policy in force, Smaug's rewards engine decides one Waste Manager share for the whole category: a Waste Manager earns only when it is a declared actor of the MassID snapshot. Under this version:

- Each Waste Manager is decided on its own from the [connection evidence](./connection-evidence.md) the audit used. An `eligible` entry earns: a `both` entry as the declared actor, a `connection` entry as a derived beneficiary without an actor in the MassID.
- The eligible period is `confirmedStartDate <= Drop-off day < effectiveEndDate`, civil days in `America/Sao_Paulo`.
- A Waste Manager that is not eligible is excluded from the split; the others keep theirs. Evidence that cannot be read or validated fails closed, without a silent discount.
- The split happens only among eligible Waste Managers. The percentages are those of Smaug's existing engine; this version does not change them.
- The beneficiaries are frozen at certificate emission. A later change of the connection does not change an issued certificate.

## References, kept separate

| Reference                     | Value                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence contract             | `connection-evidence` version `2` ([contract](./connection-evidence.md)). The contract version is not the policy version.                                          |
| Rule                          | `waste-manager-connection`, at the version in its `waste-manager-connection.rule-definition.ts` on the activation release.                                         |
| Retention of connection facts | Five years after the effective closure date, a product definition kept by Smaug for its connection history; legal validation is pending. Not part of this version. |
| Public policy text            | The rewards distribution policy published in the `docs` repository, which Smaug's ADR 0005 keeps as a living, unversioned document.                                |

## Certificates under other policies

- A certificate issued without connection evidence stays under the policy it was issued with. This version is never applied to it retroactively.
- A certificate issued under this version without its evidence reference is an error, never a reason to fall back to the earlier policy.
- Replay uses the evidence and the inputs persisted with the computation, not the current connections or the policy in force.

## Open decision

Smaug's ADR 0005 states that the rewards distribution policy is unversioned and that Smaug persists `rewardsEngineCommit` instead of a policy version. This identifier introduces a versioned reference for the connection-based eligibility only. Whether the public policy text in `docs` also carries it is a product decision outside this repository.
