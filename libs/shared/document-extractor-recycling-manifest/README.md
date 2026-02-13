# Document Extractor — Recycling Manifest (CDF)

Parsers for Brazilian **Certificado de Destinação Final (CDF)** documents.

## Layouts

### `cdf-sinfat` — SINFAT-family (SC, RS, MG, RJ, ES)

- **System**: SINFAT and derived systems (FEPAM/RS, SEMAD/MG, IMA/SC, INEA/RJ, IEMA/ES)
- **Scope**: States using SC-derived CDF format
- **Key markers**: Formatted CNPJ (`13.843.890/0001-45`), numbered waste codes (`1. 040108 - Desc`), `Tecnologia` column, `MTRs incluidos` section with 10-digit numbers, `Período` field

### `cdf-sinir` — SINIR (National)

- **System**: SINIR — Sistema Nacional de Informações sobre a Gestão dos Resíduos Sólidos
- **Scope**: National CDF from the SINIR system
- **Key markers**: ALL CAPS title, `Sistema MTR do Sinir` footer, unformatted 14-digit CNPJ, generator labels and values on SEPARATE lines, unnumbered waste codes (`200108 - Desc`), `Manifestos Incluídos:` (with colon) + 12-digit MTR numbers, `Tratamento` column
- **URL**: https://sinir.gov.br

### `cdf-custom-1` — Proprietary format

- **System**: Custom format from a specific recycler
- **Scope**: Single recycler's proprietary CDF
- **Key markers**: `Empresa Recebedora`/`Empresa Geradora` labels, `Cadastro na Cetesb`/`CADRI` references, Portuguese long-form dates (`07 de Agosto de 2024`), `Quantidade Total Tratado`
