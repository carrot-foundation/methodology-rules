# Data contract — `Others (if organic)` carbon-fraction resolution

Companion to `SPEC.md` (`SPEC-others-organic-carbon-fraction`). Holds the load-bearing schema, document, and table detail the kernel cites.

## Schema additions (`libs/shared/methodologies/bold/types`)

| Symbol | Kind | Value |
|---|---|---|
| `BoldAttributeName.CARBON_FRACTION` | attribute name | `'Carbon Fraction'` |
| `BoldAttributeName.CARBON_ANALYSIS_DATE` | attribute name | `'Carbon Analysis Date'` |
| `BoldDocumentEventName.ORGANIC_WASTE_CARBON_CHARACTERIZATION` | event name | `'Organic Waste Carbon Characterization'` |

## Tier-2 source — Waste Generator accreditation event

```
WASTE_GENERATOR accreditation document            (BoldDocumentSubtype.WASTE_GENERATOR — exists)
 └─ ORGANIC_WASTE_CARBON_CHARACTERIZATION  (event)
     ├─ [LOCAL_WASTE_CLASSIFICATION_ID]  '20 01 99'   (existing attribute)
     ├─ [CARBON_FRACTION]                '0.12'        (PercentageString)
     ├─ [CARBON_ANALYSIS_DATE]           '2026-05-01'
     └─ [LAUDO_REFERENCE]                <doc/attachment id>   (optional — audit trail)
```

- **Match key:** waste generator participant + normalized local waste code. A generator may carry several characterization events (one per code); the rule selects the event whose `LOCAL_WASTE_CLASSIFICATION_ID` matches the MassID's normalized code.
- **Retrieval:** the processor's existing `PARTICIPANT_ACCREDITATION_PARTIAL_MATCH` query already loads every participant accreditation in the graph; `collectDocuments` adds one branch capturing the accreditation whose `subtype === BoldDocumentSubtype.WASTE_GENERATOR`. Absence is normal (many generators never onboarded) → terminal state.

## Validity (CAP-3)

A Tier-2 fraction is valid only if `pickUpDate ≤ analysisDate + 2 years` (compare with `date-fns`). Expired → terminal state. Reference dates: `analysisDate` from `CARBON_ANALYSIS_DATE`; `pickUpDate` from the MassID `PICK_UP` event.

## Tier-1 author-defined table (`OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE`)

All codes verified present in `WASTE_CLASSIFICATION_CODES.BR` with `CDM_CODE = '8.7D'`. Values pending Caio/Laura sign-off.

| Local code | Carbon fraction | Reference |
|---|---|---|
| `02 01 06` | `0.15` | existing |
| `16 03 06` | `0.05` | similar to Domestic Sludge |
| `19 08 14` | `0.09` | similar to Industrial Sludge |
| `19 02 06` | `0.05` | similar to Domestic Sludge |
| `17 05 06` | `0.05` | similar to Domestic Sludge |

## Resolution result type

```ts
type OthersIfOrganicCarbonResolution =
  | { resolved: true;  carbonFraction: PercentageString; source: 'author' }
  | { resolved: true;  carbonFraction: PercentageString; source: 'generator'; analysisDate: NonEmptyString }
  | { resolved: false; reason: 'expired' | 'missing' };
```

Malformed-data cases (`INVALID_CLASSIFICATION_ID`, `SUBTYPE_CDM_CODE_MISMATCH`) are thrown (→ `FAILED`), not represented in this union (CAP-5).
