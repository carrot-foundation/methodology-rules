<div align="center">

# Waste Manager Connection

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--waste-manager-connection)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--waste-manager-connection)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)](../../../../../../libs/methodologies/bold/rule-processors/mass-id/waste-manager-connection/CHANGELOG.md)

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/waste-manager-connection/CHANGELOG.md)**

</div>

## 📄 Description

Validates each Waste Manager of the MassID against the connection evidence frozen by Smaug before the audit: declared actors need an eligible connection in force on the Drop-off day in America/Sao_Paulo (start inclusive, end exclusive), eligible connections without an actor are recorded as derived beneficiaries, and incomplete connection history goes to review.

## 📋 Methodology Framework Rules

| Rule                     | Description                                                                                                                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Waste Manager Connection | Validates each Waste Manager of the MassID against the connection evidence frozen before the audit: a declared Waste Manager needs a confirmed connection with the Waste Generator in force on the Drop-off day, and a confirmed connection without a declared actor is recorded as a derived beneficiary. |

## 📡 Events

- `ACTOR`
- `Drop-off`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/waste-manager-connection/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
