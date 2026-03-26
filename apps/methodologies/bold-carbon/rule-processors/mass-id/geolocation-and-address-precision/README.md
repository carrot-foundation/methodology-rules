<div align="center">

# Geolocation Precision

Methodology: **BOLD Carbon**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=mass-id--geolocation-and-address-precision)](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=mass-id--geolocation-and-address-precision)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

Validates event addresses against accredited addresses using tiered distance thresholds: ≤2 km passes with GPS check, 2–30 km requires address similarity review, >30 km fails. For recyclers, also validates GPS coordinates against the accredited address when available.

## 📋 Methodology Framework Rules

| Rule                           | Description                                                                                                                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop-off Geolocation Precision | In the 'Drop-off' event, the geolocation declared in the 'app-gps-latitude' and 'app-gps-longitude' metadata must be compatible with the event address data, within a 2 km radius. If GPS data is unavailable, validation falls back to the address registered in the participant's accreditation. |
| Pick-up Geolocation Precision  | In the 'Pick-up' event, the geolocation declared in the 'app-gps-latitude' and 'app-gps-longitude' metadata must be compatible with the event address data, within a 2 km radius. If GPS data is unavailable, validation falls back to the address registered in the accreditation.                |

## 📡 Events

- `Drop-off`
- `Pick-up`

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/geolocation-and-address-precision/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/AMarcosCastelo&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![andtankian](https://images.weserv.nl/?url=avatars.githubusercontent.com/andtankian&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/andtankian)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/cris-santos&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![gabrielsl96](https://images.weserv.nl/?url=avatars.githubusercontent.com/gabrielsl96&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/gabrielsl96)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/sangalli&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
