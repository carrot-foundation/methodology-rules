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
  /CERTIFICADO\s*DE\s*DESTINA/i,
  /Sistema\s+MTR\s+do\s+Sinir/i,
  /Gerador/i,
  /Identificacao\s+dos?\s+Residuos/i,
  /Manifestos?\s+Incluidos/i,
  /Declaracao/i,
  /Tratamento/i,
];

const CDF_SINIR_CONFIG: CdfParseConfig = {
  issueDatePatterns: [
    /Declaracao[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    // eslint-disable-next-line sonarjs/slow-regex
    /(\d{2}\/\d{2}\/\d{4})\s*\n\s*Responsavel/i,
  ],
  mtrDigitCount: 12,
  mtrSectionPattern:
    // eslint-disable-next-line sonarjs/slow-regex
    /Manifestos?\s+Incluidos\s*:?\s*\n?([\s\S]*?)(?=\nNome\s+do\s+Responsavel|Declaracao|$)/i,
  patterns: {
    // eslint-disable-next-line sonarjs/slow-regex
    documentNumber: /CDF\s*(?:n[°º])?\s*:?\s*(\d+(?:\/\d{2,4})?)/i,
    // eslint-disable-next-line sonarjs/slow-regex
    environmentalLicense: /Licenca\s*Ambiental\s*:?\s*([a-z0-9\-/]+)/i,

    generatorAddress:
      // eslint-disable-next-line sonarjs/slow-regex
      /Endereco\s*:?\s*(.+?)\s+Municipio\s*:?\s*(\S.+?)\s+UF\s*:?\s*(\w{2})/is,
    // eslint-disable-next-line sonarjs/slow-regex
    generatorName: /(?:Razao\s*Social|Nome)\s*:?\s*\n?\s*(.+?)(?=\n|$)/im,
    generatorTaxId:
      // eslint-disable-next-line sonarjs/slow-regex
      /(?:CPF\/CNPJ|CNPJ\/CPF|CNPJ)\s*:\s*\n?\s*(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,
    processingPeriod:
      // eslint-disable-next-line sonarjs/slow-regex
      /Periodo\s*:?\s*(\d{2}\/\d{2}\/\d{4}\s+(?:a|ate)\s+\d{2}\/\d{2}\/\d{4})/is,
    recyclerPreamble:
      /^(.+?),\s*CPF\/CNPJ\s+(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+certifica/m,
  },
  wasteTable: {
    anchorColumn: 'waste',
    // eslint-disable-next-line sonarjs/slow-regex
    codePattern: /^(\d{6})\s*-?\s*(.+)/,
    headerDefs: [
      { headerPattern: /^Res[ií]duo$/i, name: 'waste' },
      { headerPattern: /^Classe$/i, name: 'classification' },
      { headerPattern: /^Quantidade$/i, name: 'quantity' },
      { headerPattern: /^Unidade$/i, name: 'unit' },
      { headerPattern: /^Tratamento$/i, name: 'treatment' },
    ],
    technologyColumn: 'treatment',
  },
};

export class CdfSinirParser implements DocumentParser<CdfExtractedData> {
  readonly documentType = 'recyclingManifest' as const;
  readonly layoutId = 'cdf-sinir' as NonEmptyString;
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
      CDF_SINIR_CONFIG,
    );
  }
}

registerParser('recyclingManifest', 'cdf-sinir', CdfSinirParser);
