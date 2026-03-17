<div align="center">

# Waste Origin Identification

Methodology: **BOLD Carbon**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Codecov](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules)](https://codecov.io/gh/carrot-foundation/methodology-rules)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

Validates waste origin identification consistency, ensuring that identified origins have exactly one waste generator actor event and unidentified origins have none.

## 📋 Framework Rules

| Rule                               | Description                                                                                                                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIP Address                        | The address identified in the first registration event (Pick-up) must match the address indicated for the First Identified Participant. Address validation is performed based on registered address IDs.                         |
| First Identified Participant - FIP | The First Identified Participant (also known as primary participant) must be the same participant indicated in the event where the waste was first registered (Pick-up). Validation is performed based on participant IDs.       |
| One Waste Source                   | When the 'Waste Origin' metadata is not declared as 'Unidentified' in the 'Pick-up' event, there must be exactly one 'Waste Generator' actor event, identifying the source of the waste in the supply chain.                     |
| Waste Origin Identified            | When the waste origin is unknown, the 'Pick-up' event must contain the 'Waste Origin' metadata set to 'Unidentified'. When the origin is known, this metadata must not be present, indicating the waste generator is identified. |

## 📡 Events

- `ACTOR`
- `Pick-up`
- `Waste Generator`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/waste-origin-identification/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
