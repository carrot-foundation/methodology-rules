<div align="center">

# Certificate Uniqueness Check

Methodology: **BOLD-RECYCLING**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/smaug/actions)

</div>

## 📄 Description

Validates that the MassID document is not already linked to a valid RecycledID certificate or credit order document. The rule also ensures there is no existing MassID audit for the same methodology that has passed or is in progress. This prevents duplicate credit generation from the same waste mass.

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/certificate-uniqueness-check/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/43973049?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![andtankian](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/12521890?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/andtankian)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/7927374?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![gabrielsl96](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/49005645?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/gabrielsl96)
[![GLGuilherme](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/26340386?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/GLGuilherme)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/11515359?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
