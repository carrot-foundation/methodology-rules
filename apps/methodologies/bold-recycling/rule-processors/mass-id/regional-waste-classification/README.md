<div align="center">

# Local Waste Classification

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Codecov](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules)](https://codecov.io/gh/carrot-foundation/methodology-rules)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

Validates local waste classification codes and descriptions against the official Ibama Brazilian solid waste list, ensuring proper waste categorization for the jurisdiction.

## 📋 Framework Rules

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

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
