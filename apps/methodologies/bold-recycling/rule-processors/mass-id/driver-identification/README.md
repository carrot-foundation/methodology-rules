<div align="center">

# Driver Identification

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--driver-identification)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--driver-identification)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)](../../../../../../libs/methodologies/bold/rule-processors/mass-id/driver-identification/CHANGELOG.md)

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/driver-identification/CHANGELOG.md)**

</div>

## 📄 Description

Validates driver identification in the Pick-up event, ensuring either a driver identifier or an exemption justification is provided based on the vehicle type.

## 📋 Methodology Framework Rules

| Rule              | Description                                                                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Driver Identifier | When the 'Vehicle Type' is not 'Sludge Pipes', the 'Driver Identifier' metadata must be declared. If identified, the 'Internal DriverID' must be provided. If not identified, a 'Reason Dismissal DriverID' justification is required. |

## 📡 Events

- `Pick-up`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/driver-identification/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
