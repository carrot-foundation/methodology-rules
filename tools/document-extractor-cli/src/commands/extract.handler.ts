import {
  createDocumentExtractor,
  type DocumentType,
  getDefaultLayouts,
  getRegisteredLayouts,
} from '@carrot-fndn/shared/document-extractor';
import { logger } from '@carrot-fndn/shared/helpers';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

import { formatAsHuman } from '../formatters/human.formatter';
import { formatAsJson } from '../formatters/json.formatter';
import { resolveFilePaths } from '../utils/file-resolver';
import { parseS3Uri } from '../utils/s3-uri.parser';
import { promptForDocumentType, promptForFilePath } from './extract.prompts';

interface ExtractOptions {
  documentType?: DocumentType;
  json?: boolean;
  layout?: string;
  verbose?: boolean;
}

const resolveDocumentType = async (
  option: DocumentType | undefined,
): Promise<DocumentType> => {
  if (option) {
    return option;
  }

  return promptForDocumentType();
};

const resolveLayouts = (
  option: string | undefined,
  documentType: DocumentType,
): string[] => {
  if (option) {
    return [option];
  }

  const registered = getRegisteredLayouts()
    .filter((layout) => layout.documentType === documentType)
    .map((layout) => layout.layoutId);

  if (registered.length > 0) {
    return registered;
  }

  return getDefaultLayouts(documentType);
};

const resolveInputFilePaths = async (
  filePaths: string[],
): Promise<string[]> => {
  if (filePaths.length > 0) {
    const allResolved: string[] = [];

    for (const pattern of filePaths) {
      const resolved = await resolveFilePaths(pattern);

      allResolved.push(...resolved);
    }

    return allResolved;
  }

  const inputPath = await promptForFilePath();

  return resolveFilePaths(inputPath);
};

export const handleExtract = async (
  filePaths: string[],
  options: ExtractOptions,
): Promise<void> => {
  const resolvedPaths = await resolveInputFilePaths(filePaths);
  const documentType = await resolveDocumentType(options.documentType);
  const layouts = resolveLayouts(options.layout, documentType);

  const documentExtractor = createDocumentExtractor(textExtractor);

  let hasReviewRequired = false;

  for (const filePath of resolvedPaths) {
    if (resolvedPaths.length > 1) {
      logger.info(`--- ${filePath} ---`);
    }

    const s3Uri = parseS3Uri(filePath);
    const textExtractionInput = s3Uri
      ? { s3Bucket: s3Uri.bucket, s3Key: s3Uri.key }
      : { filePath };

    logger.info(`Extracting: ${documentType}, layouts: ${layouts.join(', ')}`);

    const result = await documentExtractor.extract(textExtractionInput, {
      documentType,
      layouts,
    });

    if (options.json === true) {
      logger.info(formatAsJson(result));
    } else {
      logger.info(formatAsHuman(result, { verbose: options.verbose === true }));
    }

    if (result.reviewRequired) {
      hasReviewRequired = true;
    }
  }

  if (hasReviewRequired) {
    process.exitCode = 2;
  }
};
