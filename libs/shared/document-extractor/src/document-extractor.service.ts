import type {
  TextExtractionInput,
  TextExtractionResult,
  TextExtractor,
} from '@carrot-fndn/shared/text-extractor';

import { logger } from '@carrot-fndn/shared/helpers';

import type {
  BaseExtractedData,
  BoldDocumentType,
  DocumentExtractorConfig,
  DocumentParser,
  ExtractionOutput,
} from './document-extractor.types';

import { buildExtractionOutput } from './confidence.helpers';
import {
  DOCUMENT_EXTRACTION_COMMENTS,
  type DocumentExtractionCommentKey,
} from './document-extraction.constants';
import {
  getParser,
  getRegisteredLayouts,
  selectBestParser,
  selectBestParserGlobal,
} from './layout-registry.helpers';
import { mergeTextLayerFields } from './text-layer-merge.helpers';
import { stripAccents } from './text-parsing.helpers';

const TEXT_LAYER_DOCUMENT_TYPES = new Set<BoldDocumentType>([
  'transportManifest',
]);

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
      !TEXT_LAYER_DOCUMENT_TYPES.has(parser.documentType)
    ) {
      return output;
    }

    let textLayerData: T;

    try {
      textLayerData = parser.parse(
        normalizeAccents(await this.textLayerExtractor.extractText(input)),
      ).data;
    } catch (error) {
      logger.info({ err: error }, 'No usable PDF text layer, using OCR only');

      return output;
    }

    const merge = mergeTextLayerFields(output.data, textLayerData);

    if (merge.outcome === 'unverified') {
      return output;
    }

    if (merge.outcome === 'disagreement') {
      return {
        ...output,
        reviewReasons: [
          ...output.reviewReasons,
          {
            code: 'TEXT_LAYER_MISMATCH' satisfies DocumentExtractionCommentKey,
            description: DOCUMENT_EXTRACTION_COMMENTS.TEXT_LAYER_MISMATCH(
              merge.mismatchedField,
            ),
          },
        ],
        reviewRequired: true,
      };
    }

    return {
      ...output,
      ...buildExtractionOutput(
        merge.data,
        parser.getMatchScore(extractionResult),
      ),
    };
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
