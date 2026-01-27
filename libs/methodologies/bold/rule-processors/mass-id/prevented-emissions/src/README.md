# Prevented emissions (mass-id)

## Overview

This rule calculates prevented emissions (kg CO₂e) for MassID documents under
the **BOLD Carbon (CH₄)** methodology, using:

- Static prevented-emissions factors for most organic subtypes
- A dynamic factor for subtype **Others (if organic)** (CDM **8.7D**) based on
  the local waste classification code and a configured carbon fraction

  > **Note**: The local waste classification codes referenced here (Ibama) are
  > specific to Brazil operations. For other regions, different classification
  > systems may apply.

The baseline framing and emission-factor approach are aligned with **UNFCCC
AMS-III.F v12.0** and **IPCC standards**, as referenced by the BOLD Carbon (CH₄)
methodology.

## Core concepts

### Baselines

The waste generator baseline must be provided by the Waste Generator accreditation document. See the Carrot methodology glossary definition of **Baseline**: [Glossary | Carrot White Paper](https://whitepaper.carrot.eco/carrot-methodologies/glossary).

The supported baselines are:

- Landfills with flaring of methane gas (and/or capture of biogas)
- Landfills without methane flaring
- Open-air dumps

### Static factors

For most organic subtypes, the methodology uses a fixed prevented-emissions
factor per baseline.

### Dynamic factor for Others (if organic) (CDM 8.7D)

For **Others (if organic)**, the factor is not fixed. It varies depending on
the waste type (as identified by its local waste classification code) and the
baseline selected by the waste generator.

The baseline coefficients are derived from methodology-aligned calculations
that follow the BOLD Carbon (CH₄) methodology framework.

At a high level, the rule:

- Identifies the local waste classification code recorded for the pickup
- Looks up the configured carbon fraction for that code
- Applies the baseline-specific coefficients to derive the factor

The baseline-specific coefficients (slope and intercept values) are defined in
`prevented-emissions.constants.ts` as `OTHERS_IF_ORGANIC_BASELINE_FORMULA`. Each
baseline uses a linear formula: `factor = slope × carbonFraction + intercept`.

## References

- [BOLD Carbon (CH₄) | Carrot White Paper](https://whitepaper.carrot.eco/carrot-methodologies/bold-carbon-ch4)
- [BOLD Carbon (CH₄) methodology PDF (v1.0.2)](https://drive.google.com/file/d/1TwEGKA_YAhgsb_1pFmbVxZxNN5uVEVY6/view)
