<div align="center">

# Mass ID Qualifications

Methodology: **BOLD Carbon**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Codecov](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules)](https://codecov.io/gh/carrot-foundation/methodology-rules)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

Validates that the MassID document has the correct qualifications: category must be MassID, type must be Organic, measurement unit must be kg, value must be greater than zero, and subtype must be a valid organic waste subtype.

## 📋 Framework Rules

| Rule                      | Description                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document Category         | Verifies that the document is declared with the 'MassID' category, as required by the BOLD methodologies for mass verification.                                                   |
| Document Measurement Unit | Verifies that the document's measurement unit is kilograms (kg), the standard unit adopted by the Carrot Platform.                                                                |
| Document Subtype          | Verifies that the MassID organic waste subtype belongs to the group of subtypes approved by the BOLD methodologies, as defined by CDM TOOL04 eligible organic waste type classes. |
| Document Type             | Verifies that the document type is declared as 'Organic'. The BOLD Carbon and BOLD Recycling methodologies are designed for organic waste types.                                  |
| Document Value            | Verifies that the document has a value greater than zero. The document value represents the weight of the mass registered on the platform.                                        |

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/mass-id-qualifications/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
