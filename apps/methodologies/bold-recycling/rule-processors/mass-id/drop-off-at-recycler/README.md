<div align="center">

# Drop-off At Recycling Facility

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--drop-off-at-recycler)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--drop-off-at-recycler)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)](../../../../../../libs/methodologies/bold/rule-processors/mass-id/drop-off-at-recycler/CHANGELOG.md)

**[Changelog](../../../../../../libs/methodologies/bold/rule-processors/mass-id/drop-off-at-recycler/CHANGELOG.md)**

</div>

## 📄 Description

Validates that the Drop-off event includes a receiving operator identifier and that the Drop-off address matches the Recycler ACTOR event address.

## 📋 Methodology Framework Rules

| Rule                                  | Description                                                                                                                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check Recycler and Drop-Off Addresses | At least one 'Drop-off' event must have its 'Responsible Party' address matching the address declared for the 'Recycler' actor event. Address validation is performed based on registered address IDs.                      |
| Drop-off Event                        | A 'Drop-off' event must be declared in the MassID, confirming that the waste was delivered to the correct destination and transferred to the composting facility.                                                           |
| Receiving Operator Identifier         | The 'Drop-off' event must contain the 'Receiving Operator Identifier' metadata, ensuring a responsible operator is registered for receiving the waste at the composting facility, enabling traceability and accountability. |

## 📡 Events

- `ACTOR`
- `Drop-off`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/drop-off-at-recycler/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
