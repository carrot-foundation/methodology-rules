import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  type DocumentParser,
  type ExtractionOutput,
  registerParser,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';

import { type CdfParseConfig, parseCdfDocument } from './cdf-shared.helpers';
import { type CdfExtractedData } from './recycling-manifest.types';

const SIGNATURE_PATTERNS = [
  /CDF/i,
  /Certificado\s*de\s*Destinacao/i,
  /Destinacao\s*Final/i,
  /Gerador/i,
  /Identificacao\s+dos?\s+Residuos/i,
  /MTRs?\s+incluidos/i,
  /Declaracao/i,
];

const CDF_SINFAT_CONFIG: CdfParseConfig = {
  issueDatePatterns: [/Declaracao[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i],
  mtrDigitCount: 10,
  mtrSectionPattern:
    // eslint-disable-next-line sonarjs/slow-regex
    /MTRs?\s+incluidos\s*\n([\s\S]*?)(?=\nNome\s+do\s+Responsavel|$)/i,
  patterns: {
    // eslint-disable-next-line sonarjs/slow-regex
    documentNumber: /CDF\s*(?:n[°º])?\s*:?\s*(\d+(?:\/\d{2,4})?)/i,
    // eslint-disable-next-line sonarjs/slow-regex
    environmentalLicense: /Licenca\s*Ambiental\s*:?\s*([a-z0-9\-/]+)/i,

    generatorAddress:
      // eslint-disable-next-line sonarjs/slow-regex
      /Endereco\s*:\s*(.+?)\s+Municipio\s*:\s*(\S.+?)\s+UF\s*:\s*(\w{2})/i,
    // eslint-disable-next-line sonarjs/slow-regex
    generatorName: /Razao\s*Social\s*:\s*(.+?)\s+CPF\/CNPJ/is,
    generatorTaxId:
      // eslint-disable-next-line sonarjs/regex-complexity
      /Razao\s*Social\s*:[\s\S]*?CPF\/CNPJ\s*:\s*(\d{2}[\d.]+\/\d{4}-\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,
    processingPeriod:
      /Periodo\s*:\s*(\d{2}\/\d{2}\/\d{4}\s+ate\s+\d{2}\/\d{2}\/\d{4})/is,
    recyclerPreamble:
      /^(.+?),\s*CPF\/CNPJ\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+certifica/m,
  },
  wasteTable: {
    anchorColumn: 'waste',
    // eslint-disable-next-line sonarjs/slow-regex
    codePattern: /^(?:\d+\.\s*)?(\d{6})\s*-?\s*(.+)/,
    headerDefs: [
      { headerPattern: /^Res[ií]duo$/i, name: 'waste' },
      { headerPattern: /^Classe$/i, name: 'classification' },
      { headerPattern: /^Quantidade$/i, name: 'quantity' },
      { headerPattern: /^Unidade$/i, name: 'unit' },
      { headerPattern: /^Tecnologia$/i, name: 'technology' },
    ],
    technologyColumn: 'technology',
  },
};

export class CdfSinfatParser implements DocumentParser<CdfExtractedData> {
  readonly documentType = 'recyclingManifest' as const;
  readonly layoutId = 'cdf-sinfat' as NonEmptyString;
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(
      stripAccents(extractionResult.rawText),
      SIGNATURE_PATTERNS,
    );
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<CdfExtractedData> {
    return parseCdfDocument(
      extractionResult,
      this.getMatchScore(extractionResult),
      CDF_SINFAT_CONFIG,
    );
  }
}

registerParser('recyclingManifest', 'cdf-sinfat', CdfSinfatParser);
