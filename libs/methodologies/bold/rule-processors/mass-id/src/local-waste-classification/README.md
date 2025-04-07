# Waste Classification Constants

This directory contains constants related to waste classification used in the BOLD Methodology's Mass-ID rule processor.

## Data Sources

The waste classification codes in `loca-waste-classification.constants.ts` are populated based on data from:

- [IBAMA - Brazilian List of Solid Waste](https://www.ibama.gov.br/phocadownload/emissoeseresiduos/residuos/ibama-lista-brasileira-de-residuos-solidos.xls)

The CMD_CODE values represent mappings to waste types according to the Clean Development Mechanism (CDM) categorization found in:

- [CDM Methodologies Tool](https://cdm.unfccc.int/methodologies/PAmethodologies/tools/am-tool-04-v8.0.pdf)

## CMD_CODE Mapping

The CMD codes follow this classification structure:

| CMD_CODE | Description                                                 |
| -------- | ----------------------------------------------------------- |
| 8.1      | Wood and wood products                                      |
| 8.2      | Pulp, paper and cardboard (other than sludge)               |
| 8.3      | Food, food waste, beverages and tobacco (other than sludge) |
| 8.4      | Textiles                                                    |
| 8.5      | Garden, yard and park waste                                 |
| 8.6      | Glass, plastic, metal, other inert waste                    |
| 8.7      | Others not classified above                                 |
| 8.7 (A)  | EFB similar to Garden, yard and park waste                  |
| 8.7 (B)  | Industrial Sludge                                           |
| 8.7 (C)  | Domestic Sludge                                             |
| 8.7 (D)  | Others (if organic)                                         |
