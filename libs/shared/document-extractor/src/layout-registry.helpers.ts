import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { logger } from '@carrot-fndn/shared/helpers';

import type {
  BaseExtractedData,
  DocumentParser,
  DocumentType,
  LayoutConfig,
} from './document-extractor.types';

import { isAboveMatchThreshold } from './confidence.helpers';

type ParserConstructor<T extends BaseExtractedData = BaseExtractedData> =
  new () => DocumentParser<T>;

interface RegisteredParser {
  documentType: DocumentType;
  layoutId: string;
  parserClass: ParserConstructor;
}

const registeredParsers: RegisteredParser[] = [];

export const registerParser = <T extends BaseExtractedData>(
  documentType: DocumentType,
  layoutId: string,
  parserClass: ParserConstructor<T>,
): void => {
  const existingIndex = registeredParsers.findIndex(
    (p) => p.documentType === documentType && p.layoutId === layoutId,
  );

  if (existingIndex === -1) {
    registeredParsers.push({ documentType, layoutId, parserClass });
  } else {
    registeredParsers[existingIndex] = { documentType, layoutId, parserClass };
  }
};

export const getParser = <T extends BaseExtractedData>(
  config: LayoutConfig,
): DocumentParser<T> | undefined => {
  const registered = registeredParsers.find(
    (p) =>
      p.documentType === config.documentType && p.layoutId === config.layoutId,
  );

  if (!registered) {
    return undefined;
  }

  return new registered.parserClass() as DocumentParser<T>;
};

export const getParsersByDocumentType = (
  documentType: DocumentType,
): DocumentParser<BaseExtractedData>[] =>
  registeredParsers
    .filter((p) => p.documentType === documentType)
    .map((p) => new p.parserClass());

export const getAllParsers = (): DocumentParser<BaseExtractedData>[] =>
  registeredParsers.map((p) => new p.parserClass());

export interface ParserMatchResult<T extends BaseExtractedData> {
  parser: DocumentParser<T>;
  score: number;
}

export const selectBestParser = <T extends BaseExtractedData>(
  extractionResult: TextExtractionResult,
  documentType: DocumentType,
  layoutIds: string[],
): ParserMatchResult<T> | undefined => {
  let bestMatch: ParserMatchResult<T> | undefined;

  for (const layoutId of layoutIds) {
    const parser = getParser<T>({ documentType, layoutId });

    if (!parser) {
      continue;
    }

    const score = parser.getMatchScore(extractionResult);

    logger.debug(`Layout "${layoutId}" match score: ${score.toFixed(3)}`);

    if (
      isAboveMatchThreshold(score) &&
      (!bestMatch || score > bestMatch.score)
    ) {
      bestMatch = { parser, score };
    }
  }

  if (bestMatch) {
    logger.debug(
      `Selected layout: "${bestMatch.parser.layoutId}" (score: ${bestMatch.score.toFixed(3)})`,
    );
  }

  return bestMatch;
};

export const selectBestParserGlobal = <T extends BaseExtractedData>(
  extractionResult: TextExtractionResult,
): ParserMatchResult<T> | undefined => {
  const allParsers = getAllParsers();

  let bestMatch: ParserMatchResult<T> | undefined;

  for (const parser of allParsers) {
    const score = parser.getMatchScore(extractionResult);

    logger.debug(
      `[auto-detect] "${parser.documentType}/${parser.layoutId}" match score: ${score.toFixed(3)}`,
    );

    if (
      isAboveMatchThreshold(score) &&
      (!bestMatch || score > bestMatch.score)
    ) {
      bestMatch = { parser: parser as DocumentParser<T>, score };
    }
  }

  if (bestMatch) {
    logger.debug(
      `[auto-detect] Selected: "${bestMatch.parser.documentType}/${bestMatch.parser.layoutId}" (score: ${bestMatch.score.toFixed(3)})`,
    );
  }

  return bestMatch;
};

export const getRegisteredLayouts = (): Array<{
  documentType: DocumentType;
  layoutId: string;
}> =>
  registeredParsers.map(({ documentType, layoutId }) => ({
    documentType,
    layoutId,
  }));

export const clearRegistry = (): void => {
  registeredParsers.length = 0;
};
