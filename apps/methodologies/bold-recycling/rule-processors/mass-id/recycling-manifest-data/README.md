<div align="center">

# Recycling Manifest

Methodology: **BOLD-RECYCLING**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/smaug/actions)

</div>

## 📄 Description

Validates recycling manifest events in MassID documents, ensuring they contain required attributes (document number, document type, issue date) and proper attachments. The rule validates that issue dates are in DATE format, that the recycling manifest event address matches the recycler event address, and that either a recycling manifest attachment or an exemption justification is provided.

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/mass-id/recycling-manifest/src/index.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/43973049?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![andtankian](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/12521890?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/andtankian)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/7927374?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![gabrielsl96](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/49005645?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/gabrielsl96)
[![GLGuilherme](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/26340386?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/GLGuilherme)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/11515359?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
