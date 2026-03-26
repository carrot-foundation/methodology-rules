<div align="center">

# Prevented Emissions

Methodology: **BOLD Carbon**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--prevented-emissions)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--prevented-emissions)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)](../../../../../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/CHANGELOG.md)

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/CHANGELOG.md)**

</div>

## 📄 Description

Calculates prevented emissions in kg CO2e based on the waste subtype, recycler accreditation baselines, exceeding emission coefficient, and gas type configuration.

## 📋 Methodology Framework Rules

| Rule                         | Description                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GasID Output                 | Checks the compensation index for the waste type in the recycler's accreditation page and executes the TCC calculation: document-value \* compensation index = GasID, ensuring carbon credits are correctly calculated based on waste type and volume. |
| Recycled-to-Input Conversion | Verifies the composting fertilizer coefficient in the recycler's accreditation page and checks whether the declared quantity is compatible with the calculation, ensuring accuracy in recycled-to-input conversion reporting.                          |

## 📡 Events

- `Pick-up`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/prevented-emissions/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![andtankian](https://images.weserv.nl/?url=avatars.githubusercontent.com/andtankian&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/andtankian)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![gabrielsl96](https://images.weserv.nl/?url=avatars.githubusercontent.com/gabrielsl96&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/gabrielsl96)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
