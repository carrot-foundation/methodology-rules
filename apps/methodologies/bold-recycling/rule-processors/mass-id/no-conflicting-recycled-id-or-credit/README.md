<div align="center">

# No Conflicting Recycled Id Or Credit

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--no-conflicting-certificate-or-credit)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--no-conflicting-certificate-or-credit)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)](../../../../../../libs/methodologies/bold/rule-processors/mass-id/no-conflicting-certificate-or-credit/CHANGELOG.md)

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/no-conflicting-certificate-or-credit/CHANGELOG.md)**

</div>

## 📄 Description

Validates that the MassID document is not already linked to a valid certificate or credit order document and that no other audit for the same methodology is in progress, preventing duplicate credit generation.

## 📋 Methodology Framework Rules

| Rule        | Description                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TRC Absence | Verifies that the MassID document does not already have a recycling credit event linked to it, ensuring no double counting of recycling credits (TRC). |

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/no-conflicting-certificate-or-credit/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![gabrielsl96](https://images.weserv.nl/?url=avatars.githubusercontent.com/gabrielsl96&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/gabrielsl96)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)
