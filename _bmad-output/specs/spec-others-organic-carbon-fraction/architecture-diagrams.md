# Architecture diagrams — `Others (if organic)` carbon-fraction resolution

Companion to `SPEC.md` (`SPEC-others-organic-carbon-fraction`). Diagrams only; prose lives in the kernel.

## Tiered resolution flow

```mermaid
flowchart TD
    A[Others if organic MassID] --> B{Normalized IBAMA code<br/>valid and CDM 8.7D?}
    B -- no --> F[FAILED<br/>INVALID_CLASSIFICATION_ID /<br/>SUBTYPE_CDM_CODE_MISMATCH]
    B -- yes --> T1{Tier 1:<br/>author-defined fraction?}
    T1 -- yes --> P1[PASSED · source=author]
    T1 -- no --> T2{Tier 2:<br/>generator characterization<br/>for this code?}
    T2 -- yes --> V{Within 2 years<br/>of pickup?}
    V -- yes --> P2[PASSED · source=generator]
    V -- no --> T3
    T2 -- no --> T3{Tier 3 terminal}
    T3 --> G{ENABLE_REVIEW_REQUIRED?}
    G -- on --> RR[REVIEW_REQUIRED<br/>awaiting laudo]
    G -- off --> FF[FAILED<br/>today's behavior]
```

## Document retrieval (no new query)

```mermaid
flowchart LR
    Q[PARTICIPANT_ACCREDITATION_PARTIAL_MATCH query] --> R[Recycler accreditation<br/>EMISSION_AND_COMPOSTING_METRICS]
    Q --> W[Waste Generator accreditation<br/>ORGANIC_WASTE_CARBON_CHARACTERIZATION<br/>optional]
    R --> E[evaluateResult]
    W --> E
    M[MassID PICK_UP<br/>local code + pickup date] --> E
```
