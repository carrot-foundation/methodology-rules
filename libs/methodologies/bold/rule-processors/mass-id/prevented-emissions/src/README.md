# Prevented emissions (mass-id)

## Overview

This rule calculates prevented emissions (kg CO₂e) for MassID documents under
the **BOLD Carbon (CH₄)** methodology, using:

- Static prevented-emissions factors for most organic subtypes
- A dynamic factor for subtype **Others (if organic)** (CDM **8.7D**) based on
  the local waste classification code (Ibama, Brazil) and a configured carbon
  fraction

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

The baseline coefficients below are derived from an internal Carrot calculator.

At a high level, the rule:

- Identifies the local waste classification code recorded for the pickup
- Looks up the configured carbon fraction for that code
- Applies the baseline-specific coefficients to derive the factor

Baseline-specific coefficients:

- Landfills without methane flaring: multiplier **6.901715**, offset **-0.1297012**
- Open-air dumps: multiplier **5.521373**, offset **-0.1297013**
- Landfills with flaring/capture: multiplier **3.795947**, offset **-0.129701**

## References

- [BOLD Carbon (CH₄) | Carrot White Paper](https://whitepaper.carrot.eco/carrot-methodologies/bold-carbon-ch4)
- [BOLD Carbon (CH₄) methodology PDF (v1.0.2)](https://drive.google.com/file/d/1TwEGKA_YAhgsb_1pFmbVxZxNN5uVEVY6/view)
