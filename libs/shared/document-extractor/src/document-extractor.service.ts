import type {
  TextExtractionInput,
  TextExtractor,
} from '@carrot-fndn/shared/text-extractor';

import type {
  BaseExtractedData,
  DocumentExtractorConfig,
  ExtractionOutput,
} from './document-extractor.types';

import { getParser, selectBestParser } from './layout-registry.helpers';

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
    const { documentType, layouts } = config;

    if (layouts.length === 0) {
      throw new Error('At least one layout must be provided');
    }

    const extractionResult = await this.textExtractor.extractText(input);

    if (layouts.length === 1) {
      const layoutId = layouts[0];

      if (layoutId === undefined) {
        throw new Error('At least one layout must be provided');
      }

      const parser = getParser<T>({ documentType, layoutId });

      if (!parser) {
        throw new Error(
          `No parser found for document type "${documentType}" with layout "${layoutId}"`,
        );
      }

      return parser.parse(extractionResult);
    }

    const bestMatch = selectBestParser<T>(
      extractionResult,
      documentType,
      layouts,
    );

    if (!bestMatch) {
      throw new Error(
        `No matching parser found for document type "${documentType}" among layouts: ${layouts.join(', ')}`,
      );
    }

    return bestMatch.parser.parse(extractionResult);
  }
}

export const createDocumentExtractor = (
  textExtractor: TextExtractor,
): DocumentExtractorService => new DocumentExtractor(textExtractor);
