import type {
  TextExtractionInput,
  TextExtractionResult,
  TextExtractor,
} from '@carrot-fndn/shared/text-extractor';

import type {
  BaseExtractedData,
  DocumentExtractorConfig,
  ExtractionOutput,
} from './document-extractor.types';

import {
  getParser,
  getRegisteredLayouts,
  selectBestParser,
  selectBestParserGlobal,
} from './layout-registry.helpers';
import { stripAccents } from './text-parsing.helpers';

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
  constructor(private readonly textExtractor: TextExtractor) {}

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

      const result = bestMatch.parser.parse(extractionResult);

      return {
        ...result,
        layoutId: bestMatch.parser.layoutId,
        textExtractionResult: extractionResult,
      };
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

      /* istanbul ignore next -- unreachable: guarded by length === 1 check */
      if (layoutId === undefined) {
        throw new Error('At least one layout must be provided');
      }

      const parser = getParser<T>({ documentType, layoutId });

      if (!parser) {
        throw new Error(
          `No parser found for document type "${documentType}" with layout "${layoutId}"`,
        );
      }

      const result = parser.parse(extractionResult);

      return {
        ...result,
        layoutId: parser.layoutId,
        textExtractionResult: extractionResult,
      };
    }

    const bestMatch = selectBestParser<T>(
      extractionResult,
      documentType,
      resolvedLayouts,
    );

    if (!bestMatch) {
      throw new Error(
        `No matching parser found for document type "${documentType}" among layouts: ${resolvedLayouts.join(', ')}`,
      );
    }

    const result = bestMatch.parser.parse(extractionResult);

    return {
      ...result,
      layoutId: bestMatch.parser.layoutId,
      textExtractionResult: extractionResult,
    };
  }
}

export const createDocumentExtractor = (
  textExtractor: TextExtractor,
): DocumentExtractorService => new DocumentExtractor(textExtractor);
