import type {
  TextExtractionInput,
  TextExtractionResult,
  TextExtractor,
} from '@carrot-fndn/shared/text-extractor';

import { logger } from '@carrot-fndn/shared/helpers';

import type {
  BaseExtractedData,
  DocumentExtractorConfig,
  DocumentParser,
  ExtractionOutput,
} from './document-extractor.types';

import {
  getParser,
  getRegisteredLayouts,
  selectBestParser,
  selectBestParserGlobal,
} from './layout-registry.helpers';
import {
  applyTextLayerMerge,
  mergeTextLayerFields,
} from './text-layer-merge.helpers';
import { stripAccents } from './text-parsing.helpers';

const EXPECTED_TEXT_LAYER_ERRORS = new Set(['InvalidPDFException', 'ZodError']);

const normalizeAccents = (
  result: TextExtractionResult,
): TextExtractionResult => ({
  blocks: result.blocks.map((block) => ({
    ...block,
    ...(block.text !== undefined && { text: stripAccents(block.text) }),
  })),
  rawText: stripAccents(result.rawText),
});

export interface DocumentExtractorService {
  extract<T extends BaseExtractedData>(
    input: TextExtractionInput,
    config: DocumentExtractorConfig,
  ): Promise<ExtractionOutput<T>>;
}

export class DocumentExtractor implements DocumentExtractorService {
  constructor(
    private readonly textExtractor: TextExtractor,
    private readonly textLayerExtractor?: TextExtractor,
  ) {}

  async extract<T extends BaseExtractedData>(
    input: TextExtractionInput,
    config: DocumentExtractorConfig,
  ): Promise<ExtractionOutput<T>> {
    const { documentType, layouts, textExtractionResult } = config;

    const rawResult =
      textExtractionResult ?? (await this.textExtractor.extractText(input));

    const extractionResult = normalizeAccents(rawResult);

    if (!documentType) {
      const bestMatch = selectBestParserGlobal<T>(extractionResult);

      if (!bestMatch) {
        throw new Error('No matching parser found across any document type');
      }

      return this.parseWithTextLayer(bestMatch.parser, input, extractionResult);
    }

    const resolvedLayouts =
      layouts && layouts.length > 0
        ? layouts
        : getRegisteredLayouts()
            .filter((l) => l.documentType === documentType)
            .map((l) => l.layoutId);

    if (resolvedLayouts.length === 0) {
      throw new Error(`No layouts found for document type "${documentType}"`);
    }

    if (resolvedLayouts.length === 1) {
      const layoutId = resolvedLayouts[0];

      /* v8 ignore next -- unreachable: guarded by length === 1 check */
      if (layoutId === undefined) {
        throw new Error('At least one layout must be provided');
      }

      const parser = getParser<T>({ documentType, layoutId });

      if (!parser) {
        throw new Error(
          `No parser found for document type "${documentType}" with layout "${layoutId}"`,
        );
      }

      return this.parseWithTextLayer(parser, input, extractionResult);
    }

    const bestMatch = selectBestParser<T>(
      extractionResult,
      documentType,
      resolvedLayouts,
    );

    if (!bestMatch) {
      const hasUnregisteredLayout = resolvedLayouts.some(
        (layoutId) => getParser({ documentType, layoutId }) === undefined,
      );

      if (hasUnregisteredLayout) {
        throw new Error(
          `No parser found for document type "${documentType}" with layouts: ${resolvedLayouts.join(', ')}`,
        );
      }

      throw new NoMatchingLayoutError(documentType, resolvedLayouts);
    }

    return this.parseWithTextLayer(bestMatch.parser, input, extractionResult);
  }

  private async parseWithTextLayer<T extends BaseExtractedData>(
    parser: DocumentParser<T>,
    input: TextExtractionInput,
    extractionResult: TextExtractionResult,
  ): Promise<ExtractionOutput<T>> {
    const output = {
      ...parser.parse(extractionResult),
      layoutId: parser.layoutId,
      textExtractionResult: extractionResult,
    };

    if (
      !this.textLayerExtractor ||
      parser.documentType !== 'transportManifest'
    ) {
      return output;
    }

    try {
      const textLayerData = parser.parse(
        normalizeAccents(await this.textLayerExtractor.extractText(input)),
      ).data;
      const merge = mergeTextLayerFields(output.data, textLayerData);

      logger.info(
        {
          mismatchedField:
            merge.outcome === 'disagreement'
              ? merge.mismatchedField
              : undefined,
          outcome: merge.outcome,
        },
        'PDF text layer compared with OCR',
      );

      return applyTextLayerMerge(output, merge);
    } catch (error) {
      if (
        error instanceof Error &&
        EXPECTED_TEXT_LAYER_ERRORS.has(error.name)
      ) {
        logger.info({ err: error }, 'No usable PDF text layer, using OCR only');
      } else {
        logger.warn(
          { err: error, input },
          'PDF text layer failed, using OCR only',
        );
      }

      return output;
    }
  }
}

export class NoMatchingLayoutError extends Error {
  constructor(documentType: string, layouts: string[]) {
    super(
      `No matching parser found for document type "${documentType}" among layouts: ${layouts.join(', ')}`,
    );
    this.name = 'NoMatchingLayoutError';
  }
}

export const createDocumentExtractor = (
  textExtractor: TextExtractor,
  textLayerExtractor?: TextExtractor,
): DocumentExtractorService =>
  new DocumentExtractor(textExtractor, textLayerExtractor);
