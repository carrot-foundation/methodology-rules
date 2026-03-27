<div align="center">

# Local Waste Classification

Methodology: **BOLD Carbon**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--regional-waste-classification)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--regional-waste-classification)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)](../../../../../../libs/methodologies/bold/rule-processors/mass-id/regional-waste-classification/CHANGELOG.md)

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/regional-waste-classification/CHANGELOG.md)**

</div>

## 📄 Description

Validates local waste classification codes and descriptions against the official Ibama Brazilian solid waste list, verifying code existence, description accuracy, and CDM code alignment with the document subtype.

## 📋 Methodology Framework Rules

| Rule                             | Description                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local Waste Classification       | The 'Pick-up' event must contain a 'Local Waste Classification ID' attribute with a code from the official waste classification of the jurisdiction where the waste was collected, and a 'Local Waste Classification Desc' attribute with the corresponding description. When the country code is 'BR', the fields must match the Brazilian solid waste list from Ibama. |
| Local Waste Classification x CDM | When the country code of the collection address is 'BR', the 'Local Waste Classification ID' must correspond to an organic waste type from CDM Tool 04, mapped according to the Ibama-CDM correspondence table.                                                                                                                                                          |

## 📡 Events

- `ACTOR`
- `Pick-up`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/regional-waste-classification/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)
