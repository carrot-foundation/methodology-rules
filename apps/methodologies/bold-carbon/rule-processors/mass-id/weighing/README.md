<div align="center">

# Weighing

Methodology: **BOLD Carbon**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--weighing)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--weighing)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)](../../../../../../libs/methodologies/bold/rule-processors/mass-id/weighing/CHANGELOG.md)

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/weighing/CHANGELOG.md)**

</div>

## 📄 Description

Validates weighing events in MassID documents, including event values, container types, capture methods, scale types, and scale ticket verification. Supports both single-step and two-step weighing processes.

## 📋 Methodology Framework Rules

| Rule                    | Description                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container Type          | In the 'WEIGHING' event, the 'Container Type' metadata must be present with one of the following values: Bag, Bin, Drum, Pail, Street Bin, Waste Box, or Truck.                                                                                                                                                                                                   |
| Net Weight Verification | When a 'WEIGHING' event satisfies the 'Weighing Fields' rule, the following calculation is verified: Mass Net Weight = Gross Weight - (Tare \* Container Quantity). If 'Container Quantity' is not provided, a value of 1 is assumed.                                                                                                                             |
| Scale Accreditation     | In the 'WEIGHING' event, the 'Scale Accreditation' metadata must be present with a link to the scale validation event in the accreditation of the participant responsible for weighing.                                                                                                                                                                           |
| Scale Type              | In the 'WEIGHING' event, the 'Scale Type' metadata must be declared and identified as one of the approved types: Weighbridge (Truck Scale), Floor Scale, Pallet Scale, Forklift Scale, Conveyor Belt Scale, Hanging/Crane Scale, Bin Scale, Portable Axle Weigher, Onboard Truck Scale, Precision/Bench Scale, or Two-bin Lateral Scale.                          |
| Truck Weighing          | In the 'WEIGHING' event, when the 'Container Type' is 'Truck', a 'Vehicle License Plate' attribute must be present.                                                                                                                                                                                                                                               |
| Weight Capture Method   | In the 'WEIGHING' event, the 'Weight Capture Method' metadata must be present with one of the following values: Digital, Photo (Scale+Cargo), Manual, or Transport Manifest.                                                                                                                                                                                      |
| Weighing Fields         | The MassID must have at least one 'WEIGHING' event with the following metadata: 'Gross Weight' (decimal > 0, in kg), 'Container Capacity' (decimal > 0, in KILOGRAM, LITER, or CUBIC_METER), 'Tare' (decimal >= 0, in kg), 'Mass Net Weight' (decimal > 0, in kg), and 'Container Quantity' (integer >= 1, required when Container Type is not 'Truck').          |
| Weighing in two steps   | When a 'WEIGHING' event lacks 'Mass Net Weight' and 'Tare', it must have 'Gross Weight' and 'Container Capacity'. A second 'WEIGHING' event must then follow with matching 'Gross Weight', 'Container Capacity', 'Scale Type', 'Scale Accreditation', 'Container Type', and 'Vehicle License Plate' values, plus all other fields per the 'Weighing Fields' rule. |

## 📡 Events

- `Transport Manifest`
- `Weighing`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/weighing/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![andtankian](https://images.weserv.nl/?url=avatars.githubusercontent.com/andtankian&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/andtankian)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![gabrielsl96](https://images.weserv.nl/?url=avatars.githubusercontent.com/gabrielsl96&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/gabrielsl96)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)
