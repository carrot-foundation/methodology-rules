# Rewards distribution policy with connected Waste Managers

Release artifact for the distribution policy version that pays each Waste Manager from the connection evidence instead of from the declared actor alone. It names the version Smaug writes as `policyVersion`, who reads it, what the version changes, and the separate references it depends on. Status: **proposed, not published**. Nothing in this repository applies it; activation follows [Waste Manager connection activation](./waste-manager-connection-activation.md).

## Identifier

`policyVersion` is the methodology application release that adopts the `waste-manager-connection` rule:

```text
<methodology>@<application version>
```

| Methodology      | `policyVersion`                                       |
| ---------------- | ----------------------------------------------------- |
| `bold-carbon`    | `bold-carbon@<filled from the activation release>`    |
| `bold-recycling` | `bold-recycling@<filled from the activation release>` |

The version comes from the existing release flow, never from a number picked by hand. When the activation pull request merges, `.github/workflows/version-and-sync.yaml` runs `pnpm bump:applications`, writes `version` in `libs/methodologies/<methodology>/rules/src/methodology-application.config.ts`, tags `methodology-application/<methodology>@<version>`, and dispatches the rules manifest, which carries that version, to the `carrot-foundation/docs` repository. Fill the table from the tag.

The identifier must differ from the application version in force while the rule is off. Both applications are at `1.0.0` and no `methodology-application/*` tag exists. `bump:applications` measures added framework rules against the latest tag, so with no tag the activation merge produces no new version and the activation stops. A baseline tag `methodology-application/<methodology>@1.0.0` on the commit in force before the activation merge lets the added framework rule count as a minor bump. Creating it is a release decision for the methodology rules maintainers.

## Who reads it

| Component                  | Use                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Smaug `prepare`            | Writes it into every `connection-evidence` object of the methodology.                                                     |
| `waste-manager-connection` | Copies it into `resultContent`; the rule does not compare it with anything.                                               |
| Smaug emission             | Admits an emission under this version only for evidence carrying it, and freezes it with the certificate's beneficiaries. |
| Smaug sale and replay      | Apply the version frozen with the certificate.                                                                            |

## What this version changes

The engine in force pays one Waste Manager share per certificate when the MassID declares a Waste Manager actor, the waste origin is identified, and the Waste Generator finished onboarding. Otherwise the share returns to the origin participants through `WASTE_MANAGER_ORIGIN_SPLIT`. Under this version:

- Which Waste Managers take part comes from the [connection evidence](./connection-evidence.md) the audit used, one decision per Waste Manager. An `eligible` entry takes part: a `both` entry as the declared actor, a `connection` entry as a derived beneficiary without an actor in the MassID. The eligible period is the one in [Connection period](./connection-evidence.md#connection-period).
- The engine's other conditions, its percentages and its return to origin when no Waste Manager takes part are unchanged; the engine receives the eligible Waste Managers as a resolved fact.
- The Waste Manager share is divided among the eligible Waste Managers only. One that is not eligible is left out of that division without affecting another.
- Evidence that cannot be read or validated fails closed, without a silent discount.
- The beneficiaries are frozen at certificate emission. A later change of the connection does not change an issued certificate.

## References, kept separate

| Reference                     | Value                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence contract             | `connection-evidence` version `2` ([contract](./connection-evidence.md)). The contract version is not the policy version.                                               |
| Rule                          | `waste-manager-connection`, at the version in its `waste-manager-connection.rule-definition.ts` on the activation release.                                              |
| Retention of connection facts | Five years after the effective closure date, defined for Smaug's connection history; not implemented, and legal validation is pending. Not part of this policy version. |
| Public policy text            | The rewards distribution policy published in the `carrot-foundation/docs` repository, which Smaug's ADR 0005 keeps as a living, unversioned document.                   |

## Certificates under other policies

- A certificate issued without connection evidence stays under the policy it was issued with. This version is never applied to it retroactively.
- A certificate issued under this version without its evidence reference is an error, never a reason to fall back to the earlier policy.
- Sale and replay use the version, evidence and inputs frozen with the certificate, not the current connections or the policy in force.

## Open decisions

- Smaug's ADR 0005 states that the rewards distribution policy is unversioned and that Smaug persists `rewardsEngineCommit` instead of a policy version. This identifier introduces a versioned reference for the connection-based eligibility. Whether the public policy text in `carrot-foundation/docs` carries it is a product decision outside this repository.
- The baseline tag that lets the activation release produce a new application version.
