# Document Extractor — Transport Manifest (MTR)

Parsers for Brazilian **Manifesto de Transporte de Resíduos (MTR)** documents.

## Layouts

### `mtr-sinir` — SINIR (National)

- **System**: SINIR — Sistema Nacional de Informações sobre a Gestão dos Resíduos Sólidos
- **Scope**: States without their own MTR system
- **Key markers**: `Manifesto de Transporte de Resíduos e Rejeitos`, IBAMA header, 12-digit MTR number with colon (`MTR Nº: 240001460711`), `Tratamento` column
- **URL**: https://sinir.gov.br

### `mtr-sigor` — SIGOR (São Paulo / CETESB)

- **System**: SIGOR — Sistema Estadual de Gerenciamento Online de Resíduos Sólidos
- **Scope**: São Paulo state (CETESB)
- **Key markers**: `CETESB` header, `Identificação do Gerador/Transportador/Destinador` sections, `Razão Social` + `CPF/CNPJ` fields, table-based waste extraction with `Item`/`Código IBAMA` columns
- **URL**: https://cetesb.sp.gov.br

### `mtr-sinfat` — SINFAT-family (SC, RS, MG, RJ, ES)

- **System**: SINFAT and derived systems (FEPAM/RS, SEMAD/MG, IMA/SC, INEA/RJ, IEMA/ES)
- **Scope**: Santa Catarina, Rio Grande do Sul, Minas Gerais, Rio de Janeiro, Espírito Santo
- **Key markers**: `Manifesto de Transporte de Resíduos` WITHOUT "e Rejeitos", agency header (`Fundação Estadual`/`Secretaria de Estado`), `Tecnologia` column, 10-digit MTR number (`MTR nº 0124048986`)
