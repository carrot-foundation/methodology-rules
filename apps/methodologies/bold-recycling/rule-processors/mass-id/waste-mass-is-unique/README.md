<div align="center">

# Uniqueness Check

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--waste-mass-is-unique)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--waste-mass-is-unique)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

Validates that no duplicate MassID documents exist with the same combination of Drop-off event, Pick-up event, Recycler ACTOR event, Waste Generator ACTOR event, and vehicle license plate.

## 📋 Framework Rules

| Rule                                    | Description                                                                                                                                                                                                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double-checking Recycler Emitted Masses | Checks the operational capacity in the recycler's accreditation page. If the sum of masses processed by the same recycler in the same month exceeds the operational capacity by more than 3%, the MassID is blocked for credit generation until approved by the operations department. |
| Double-checking Source Emitted Masses   | Checks the monthly waste generation ceiling in the source's accreditation page. If the sum of masses from the same generator in the same month exceeds the ceiling by more than 20%, the MassID is blocked for credit generation until reviewed by the operations department.          |
| Duplicate Check                         | Verifies that no other mass documents exist with the same document value, same date and time of receipt at the recycling yard, same generator, and same vehicle. Duplicate documents are rejected to prevent inconsistencies.                                                          |
| Route Check                             | Verifies that the date, time of the 'Drop-Off' event, and 'vehicle-license-plate' of the audited MassID are unique. If there is a conflict with another MassID, the mass is rejected to prevent duplicate or inconsistent records.                                                     |

## 📡 Events

- `ACTOR`
- `Drop-off`
- `Pick-up`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/waste-mass-is-unique/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
