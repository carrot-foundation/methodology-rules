<div align="center">

# Vehicle Identification

Methodology: **BOLD Recycling**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Codecov](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules)](https://codecov.io/gh/carrot-foundation/methodology-rules)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

Validates vehicle identification in the pick-up event, ensuring the appropriate identification method is used based on the vehicle type: license plate, description, or no identification required.

## 📋 Framework Rules

| Rule                  | Description                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vehicle Description   | When the 'Vehicle Type' metadata is 'Others' in the 'Pick-up' event, a 'Vehicle Description' metadata must be declared, ensuring all non-standard transport means are properly identified and documented.     |
| Vehicle License Plate | In the 'Pick-up' event, when the 'Vehicle Type' is not 'Sludge Pipes', 'Cart', or 'Bicycle', the 'Vehicle License Plate' metadata must be declared to enable transport tracking and prevent fraud.            |
| Vehicle Type          | In a MassID document, the 'Vehicle Type' metadata is mandatory and must be one of the methodology-approved types: Truck, Car, Mini Van, Bicycle, Motorcycle, Cart, Sludge Pipes, Boat, Cargo Ship, or Others. |

## 📡 Events

- `Pick-up`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/vehicle-identification/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
