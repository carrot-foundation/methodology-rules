---
title: 'Tiered carbon-fraction resolution for Others (if organic)'
type: 'feature'
created: '2026-06-24'
status: 'done'
baseline_commit: '20c1ed4c7307de99c568c28e19f70d2cbbf1483e'
context:
  - '{project-root}/_bmad-output/specs/spec-others-organic-carbon-fraction/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-others-organic-carbon-fraction/data-contract.md'
  - '{project-root}/docs/superpowers/plans/2026-06-23-others-organic-carbon-fraction.md'
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `prevented-emissions` returns `FAILED` for any `Others (if organic)` MassID whose IBAMA code is missing from a hardcoded one-entry carbon-fraction table, so valid organic waste (e.g. `20 01 99`, `02 02 99`) earns no carbon credit — failing real Biocomp masses today.

**Approach:** Resolve the `Others (if organic)` carbon fraction through a fallback chain — author-defined table → fraction registered on the Waste Generator accreditation (laudo, valid 2 years) → flag-gated terminal state — replacing the throwing lookup with a non-throwing discriminated resolver. Malformed-classification cases stay hard `FAILED`.

## Boundaries & Constraints

**Always:** Flag-off path is byte-for-byte today's `FAILED` (zero regression). Author tier wins over generator tier. Terminal state gated by `ENABLE_REVIEW_REQUIRED` via `getEnableReviewRequired()` (off→`FAILED`, on→`REVIEW_REQUIRED`). 2-year validity = `pickUpDate ≤ analysisDate + 2y` (date-fns). Named exports, explicit return types, no `any`/`!`, `@carrot-fndn/*` aliases. Vitest unit + mandatory `*.lambda.e2e.spec.ts`. **Do not commit — leave the working tree for human review.**

**Ask First:** Going live with the author `%C` values (pending Caio/Laura sign-off). Adding unit/facility-level match granularity. Renaming the chosen schema symbols.

**Never:** Write or produce documents from the rule (read-only). Cross-generator duplicate-fraction integrity check (Ops dataset concern). Any change to non-`Others` static-factor behavior. Smaug-side laudo registration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tier 1 author | code `16 03 06` (in author table) | `PASSED`, `othersIfOrganicAudit.source='author'` | N/A |
| Tier 2 generator | code `20 01 99`, valid generator characterization, pickup ≤ analysis+2y | `PASSED`, `source='generator'` + `analysisDate` | N/A |
| Tier 2 expired | generator characterization, pickup > analysis+2y | terminal (expired) | flag off→`FAILED`, on→`REVIEW_REQUIRED` |
| Tier 3 missing | no author, no generator value | terminal (missing) | flag off→`FAILED`, on→`REVIEW_REQUIRED` |
| Malformed | unknown code OR CDM≠8.7D | `FAILED` | `INVALID_CLASSIFICATION_ID` / `SUBTYPE_CDM_CODE_MISMATCH` |
| Non-Others | static-factor subtype | `PASSED` (unchanged) | N/A |

</frozen-after-approval>

## Code Map

- `libs/shared/methodologies/bold/types/src/enum.types.ts` -- add `CARBON_FRACTION`, `CARBON_ANALYSIS_DATE`, `ORGANIC_WASTE_CARBON_CHARACTERIZATION`
- `libs/shared/methodologies/bold/testing/.../bold-participant-accreditation.stubs.ts` -- generator characterization event stub
- `.../prevented-emissions/src/prevented-emissions.constants.ts` -- expand Tier-1 table; Tier-3 comments
- `.../prevented-emissions/src/prevented-emissions.types.ts` -- `GeneratorCarbonCharacterization`, `OthersIfOrganicCarbonResolution`
- `.../prevented-emissions/src/prevented-emissions.others-organic.helpers.ts` -- extraction + validity + non-throwing resolver
- `.../prevented-emissions/src/prevented-emissions.helpers.ts` -- split static-factor path
- `.../prevented-emissions/src/prevented-emissions.rule-subject.ts` -- generator + pickup fields
- `.../prevented-emissions/src/prevented-emissions.processor.ts` -- collect generator accreditation, tiered `evaluateResult`

## Tasks & Acceptance

Full TDD steps with code live in the linked plan (`docs/superpowers/plans/2026-06-23-others-organic-carbon-fraction.md`, Tasks 1–10). Each task is test-first; **no commits** — pause for human review when a task goes green.

**Execution:**
- [x] `enum.types.ts` -- add two attribute names + one event name -- contract the rule reads
- [x] `prevented-emissions.constants.ts` -- add 4 author codes (`16 03 06`=0.05, `19 08 14`=0.09, `19 02 06`=0.05, `17 05 06`=0.05) -- Tier 1
- [x] `bold-participant-accreditation.stubs.ts` -- `stubBoldOrganicWasteCarbonCharacterizationEvent` -- enables Tier-2 tests
- [x] `prevented-emissions.types.ts` -- characterization + resolution union -- shared types
- [x] `prevented-emissions.others-organic.helpers.ts` -- `isCarbonCharacterizationValid`, `getGeneratorCarbonCharacterization`, `resolveOthersIfOrganicCarbonFraction` -- core Tier logic
- [x] `prevented-emissions.helpers.ts` -- `getStaticPreventedEmissionsFactor` -- decouple from deleted throwing lookup
- [x] `prevented-emissions.rule-subject.ts` -- optional `generatorCarbonFraction`/`generatorCarbonAnalysisDate`/`pickUpDate` -- carry Tier-2 data
- [x] `prevented-emissions.processor.ts` + `constants.ts` -- collect WASTE_GENERATOR accreditation; tiered + flag-gated `evaluateResult` -- wire it together
- [x] `prevented-emissions.test-cases.ts` + `*.lambda.e2e.spec.ts` -- all tiers + both flag states -- coverage
- [x] verify across affected projects

**Acceptance Criteria:**
- Given an `Others (if organic)` MassID with an author code, when evaluated, then `PASSED` with `source='author'`.
- Given no author value but a valid generator characterization, when evaluated, then `PASSED` with `source='generator'`.
- Given no resolvable fraction and `ENABLE_REVIEW_REQUIRED` off, when evaluated, then `FAILED` (matches today); on, then `REVIEW_REQUIRED`.
- Given a non-`Others` subtype, when evaluated, then behavior is unchanged.

## Design Notes

Resolver returns `{resolved:true, carbonFraction, source}` | `{resolved:false, reason:'expired'|'missing'}`; malformed cases still throw (→`FAILED`). Flag-gating mirrors `geolocation-and-address-precision.helpers.ts:67` (`if (getEnableReviewRequired()) return REVIEW_REQUIRED; return FAILED`). Generator accreditation rides the existing `PARTICIPANT_ACCREDITATION_PARTIAL_MATCH` query — only `collectDocuments` gains a `WASTE_GENERATOR` branch.

## Verification

**Commands:**
- `pnpm nx test prevented-emissions` -- expected: all unit + e2e pass
- `pnpm nx test methodologies-bold-types methodologies-bold-testing` -- expected: schema + stub tests pass
- `pnpm ts:affected && pnpm lint:affected` -- expected: clean

## Suggested Review Order

**Tiered resolution (core logic — start here)**

- Entry point: the 3-tier author→generator→terminal decision, non-throwing
  [`others-organic.helpers.ts:228`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.others-organic.helpers.ts#L228)

- Tier-2 extraction: newest matching event, validated fraction + date
  [`others-organic.helpers.ts:161`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.others-organic.helpers.ts#L161)

- 2-year validity window, timezone-stable (UTC start-of-day)
  [`others-organic.helpers.ts:152`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.others-organic.helpers.ts#L152)

**Processor wiring + flag-gated terminal**

- Consumes the resolver; PASSED with audit `source`
  [`processor.ts:352`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.processor.ts#L352)

- Terminal state driven by `resolution.reason`; REVIEW_REQUIRED vs FAILED via the flag
  [`processor.ts:276`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.processor.ts#L276)

- Generator accreditation collected from the existing participant-accreditation query
  [`processor.ts:319`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.processor.ts#L319)

- Non-Others path unchanged (static factor)
  [`processor.ts:159`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.processor.ts#L159)

**Data contract (schema + constants)**

- New attribute + event names the rule reads
  [`enum.types.ts:71`](../../libs/shared/methodologies/bold/types/src/enum.types.ts#L71)

- Tier-1 author table (values pending Caio/Laura sign-off)
  [`prevented-emissions.constants.ts:136`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.constants.ts#L136)

- Discriminated resolution union
  [`prevented-emissions.types.ts:16`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.types.ts#L16)

- Optional generator + pickup fields on the rule subject
  [`prevented-emissions.rule-subject.ts:17`](../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/prevented-emissions.rule-subject.ts#L17)

**Test support**

- Generator characterization event stub
  [`bold-participant-accreditation.stubs.ts:116`](../../libs/shared/methodologies/bold/testing/src/builders/bold-participant-accreditation.stubs.ts#L116)
