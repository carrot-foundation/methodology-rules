---
id: SPEC-others-organic-carbon-fraction
companions:
  - data-contract.md
  - architecture-diagrams.md
  - ../../project-context.md
  - ../../../docs/superpowers/plans/2026-06-23-others-organic-carbon-fraction.md
sources:
  - ../../../docs/superpowers/specs/2026-06-23-others-organic-carbon-fraction-design.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Tiered carbon-fraction resolution for `Others (if organic)`

## Why

**A pain to solve.** The `prevented-emissions` rule computes prevented CO₂e for organic-waste MassIDs. For the `Others (if organic)` subtype (CDM `8.7D`) the factor depends on a carbon fraction keyed by the IBAMA waste code, but today that fraction comes from a hardcoded one-entry table — so any other valid `8.7D` code (e.g. `20 01 99`, `02 02 99`) fails the rule and the waste earns no carbon credit. Operations (Laura Budzisz) and the Biocomp characterization study ask for a fallback: when the framework author has not assigned a fraction, use one registered for that specific waste generator from a validated lab report (laudo). It matters now because real Biocomp masses are failing prevented-CO₂e today on exactly these codes.

## Capabilities

- **CAP-1**
  - **intent:** The rule can compute prevented emissions for an `Others (if organic)` MassID using an author-assigned carbon fraction keyed by its IBAMA code.
  - **success:** A MassID with code `16 03 06` yields `PASSED` with `othersIfOrganicAudit.source = 'author'` and the formula-derived factor.

- **CAP-2**
  - **intent:** When no author-defined value exists, the rule can use a carbon fraction registered on the waste generator's accreditation (from a laudo) for that waste code.
  - **success:** A MassID with code `20 01 99` plus a valid generator characterization for that code yields `PASSED` with `othersIfOrganicAudit.source = 'generator'`.

- **CAP-3**
  - **intent:** The rule rejects a generator-registered fraction once it is older than the validity window relative to the MassID pickup.
  - **success:** When pickup date is more than 2 years after the registered fraction's analysis date, the value is treated as not available (expired) and the rule moves to the terminal state.

- **CAP-4**
  - **intent:** When no fraction resolves through any tier, the rule ends the MassID audit with a status that reflects "awaiting laudo," gated for safe rollout.
  - **success:** With `ENABLE_REVIEW_REQUIRED` off the verdict is `FAILED` (today's behavior); with it on the verdict is `REVIEW_REQUIRED` carrying an awaiting-laudo comment (distinct comment for absent vs expired).

- **CAP-5**
  - **intent:** Malformed classification data continues to fail hard, distinct from the "missing fraction" path.
  - **success:** An unknown code or a code whose CDM is not `8.7D` yields `FAILED` (`INVALID_CLASSIFICATION_ID` / `SUBTYPE_CDM_CODE_MISMATCH`), unchanged from today.

## Constraints

- The flag-off path must be byte-for-byte today's behavior (`FAILED`) — zero regression.
- The terminal state is gated by `ENABLE_REVIEW_REQUIRED` via `getEnableReviewRequired()`; the Lambda wrapper still downgrades `REVIEW_REQUIRED → FAILED` externally until Smaug supports the status.
- Tier order is fixed: an author-defined fraction always wins over a generator-registered one.
- The rule only **consumes** the generator characterization event; it never writes documents.
- Scope is the methodology-rules repository only: rule logic, the document contract it reads, and tests.
- See `data-contract.md` for the exact schema additions, the generator-accreditation event shape, the match key, and the author-defined code table.

## Non-goals

- The Smaug-side flow that registers a validated laudo and writes the characterization event into the generator accreditation (separate ticket).
- The cross-generator duplicate-fraction integrity analysis (study §6) — an Operations dataset check, not a per-MassID rule.
- Unit/facility-level match granularity in v1 (generator + waste code only).
- Any change to non-`Others` subtypes' static-factor behavior.

## Success signal

A real Biocomp `Others (if organic)` MassID (e.g. code `20 01 99`) that fails prevented-CO₂e today produces a correct `PASSED` verdict (`source = 'generator'`) once a valid generator carbon fraction is registered, while masses with no available fraction cleanly end the audit (`REVIEW_REQUIRED`/`FAILED`) instead of silently mis-failing on a missing lookup.

## Assumptions

- Pickup reference date = the MassID `PICK_UP` event's `externalCreatedAt`, falling back to the document's `externalCreatedAt`.
- New schema names are chosen, not yet team-ratified: `BoldAttributeName.CARBON_FRACTION`, `BoldAttributeName.CARBON_ANALYSIS_DATE`, `BoldDocumentEventName.ORGANIC_WASTE_CARBON_CHARACTERIZATION`.

## Open Questions

- Author `%C` values for the study's Tabela 2 codes (`16 03 06`=0.05, `19 08 14`=0.09, `19 02 06`=0.05, `17 05 06`=0.05) are implemented but pending Caio/Laura sign-off before go-live.
- Is unit/facility-level match granularity required, or is `generator + waste code` sufficient? (Assumed sufficient for v1.)
