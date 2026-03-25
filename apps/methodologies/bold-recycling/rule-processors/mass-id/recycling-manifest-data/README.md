<div align="center">

# Recycling Manifest Data

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--document-manifest-data)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--document-manifest-data)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

Validates transport and recycling manifest events in MassID documents, ensuring they contain required attributes, proper document attachments, and valid exemption justifications. Cross-validates manifest data against extracted document content when available.

## 📋 Framework Rules

| Rule                                       | Description                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Has Recycling Manifest                     | Verifies that the 'Recycling Manifest' event is declared in the MassID document, confirming that the waste was effectively processed at a recycling facility.                                                                                                                      |
| Has Transport Manifest                     | Verifies that the 'Transport Manifest' event is declared in the MassID document, ensuring proof of waste transport is properly documented and traceable.                                                                                                                           |
| Recycling Manifest Address                 | The address declared in the 'Recycling Manifest' event must match the address of the 'Recycler' actor, ensuring the waste was processed at the correct location. Address validation is performed based on registered address IDs.                                                  |
| Recycling Manifest Attachment              | When a 'Recycling Manifest' event does not have an 'Exemption Justification' metadata, it must contain an attachment named 'Recycling Manifest'. The required supporting document may vary by country where the recycler is located.                                               |
| Recycling Manifest Exemption Justification | When a 'Recycling Manifest' event does not contain the metadata required by the 'Recycling Manifest Fields' rule, an 'Exemption Justification' metadata must be declared with a non-empty value.                                                                                   |
| Recycling Manifest Fields                  | When a 'Recycling Manifest' event has no 'Exemption Justification', the following metadata must be filled: 'Document Type', 'Document Number', and 'Document Date Issue'. When the Recycler is located in Brazil (country='BR'), the 'Document Type' must be 'CDF'.                |
| Recycling Manifest Value                   | When a 'Recycling Manifest' event has no 'Exemption Justification', the 'Event Value' metadata must exactly match the 'value' declared in the document, preventing discrepancies in the recycling record.                                                                          |
| Transport Manifest Attachment              | When a 'Transport Manifest' event does not have an 'Exemption Justification' metadata, it must contain an attachment named 'Transport Manifest' as documentary proof of transport.                                                                                                 |
| Transport Manifest Exemption Justification | When a 'Transport Manifest' event does not contain the metadata required by the 'Transport Manifest Fields' rule, an 'Exemption Justification' metadata must be declared with a non-empty value.                                                                                   |
| Transport Manifest Fields                  | When a 'Transport Manifest' event has no 'Exemption Justification', the following metadata must be filled: 'Document Type', 'Document Number', 'Document Date Issue', and 'Event Value'. When the Recycler is located in Brazil (country='BR'), the 'Document Type' must be 'MTR'. |

## 📡 Events

- `ACTOR`
- `Drop-off`
- `Pick-up`
- `Recycling Manifest`
- `Transport Manifest`
- `Weighing`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/document-manifest-data/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![andtankian](https://images.weserv.nl/?url=avatars.githubusercontent.com/andtankian&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/andtankian)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
