<div align="center">

# Project Boundary

Methodology: **BOLD Carbon**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--project-boundary)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--project-boundary)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

**Version:** 1.0.0

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/project-boundary/CHANGELOG.md)**

</div>

## 📄 Description

Calculates the geographic distance in kilometers between the Pick-up and Drop-off event addresses, determining the project boundary scope.

## 📋 Methodology Framework Rules

| Rule                       | Description                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Methodology Distance Limit | Verifies the distance between the 'Pick-up' and 'Drop-off' event geolocations. Distances exceeding 200 km are flagged for review in the Carrot Operations Dashboard, as the project boundary established under UNFCCC AMS-III.F. is 200 km. |

## 📡 Events

- `Drop-off`
- `Pick-up`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/project-boundary/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
