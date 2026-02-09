import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';

export const formatAsJson = <T extends BaseExtractedData>(
  result: ExtractionOutput<T>,
): string => JSON.stringify(result, undefined, 2);
