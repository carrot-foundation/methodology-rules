import {
  type BaseExtractedData,
  createDocumentExtractor,
  type DocumentType,
  type ExtractionOutput,
  getDefaultLayouts,
  getRegisteredLayouts,
} from '@carrot-fndn/shared/document-extractor';
import { logger } from '@carrot-fndn/shared/helpers';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { formatAsHuman } from '../formatters/human.formatter';
import { formatAsJson } from '../formatters/json.formatter';
import { resolveFilePaths } from '../utils/file-resolver';
import { parseS3Uri } from '../utils/s3-uri.parser';
import { promptForDocumentType, promptForFilePath } from './extract.prompts';

interface ExtractOptions {
  concurrency: number;
  documentType?: DocumentType | undefined;
  json?: boolean | undefined;
  layout?: string | undefined;
  outputFailures?: string | undefined;
  verbose?: boolean | undefined;
}

interface FileFailure {
  error: string;
  filePath: string;
}

interface FileSuccess {
  filePath: string;
  result: ExtractionOutput<BaseExtractedData>;
}

const resolveDocumentType = async (
  option: DocumentType | undefined,
  isInteractive: boolean,
): Promise<DocumentType | undefined> => {
  if (option) {
    return option;
  }

  if (!isInteractive) {
    return undefined;
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

const writeFailuresFile = async (
  failures: FileFailure[],
  outputPath: string | undefined,
): Promise<void> => {
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const failurePath =
    outputPath ?? path.resolve(`extraction-failures-${timestamp}.txt`);

  const lines = [
    `# Extraction failures - ${new Date().toISOString()}`,
    `# Re-run: pnpm extract-document extract ${failurePath}`,
    '',
  ];

  for (const failure of failures) {
    lines.push(`# ${failure.filePath} — ${failure.error}`, failure.filePath);
  }

  await writeFile(failurePath, `${lines.join('\n')}\n`, 'utf8');

  logger.info(`Failed file list written to: ${failurePath}`);
};

const logFileResult = (
  fileResult: FileSuccess,
  isBatch: boolean,
  options: ExtractOptions,
): void => {
  if (isBatch) {
    logger.info(`--- ${fileResult.filePath} ---`);
  }

  if (options.json === true) {
    logger.info(formatAsJson(fileResult.result));
  } else {
    logger.info(
      formatAsHuman(fileResult.result, {
        verbose: options.verbose === true,
      }),
    );
  }
};

const processBatchResults = (
  settled: PromiseSettledResult<FileSuccess>[],
  batch: string[],
  successes: FileSuccess[],
  failures: FileFailure[],
  isBatch: boolean,
  options: ExtractOptions,
): void => {
  for (const [entryIndex, result] of settled.entries()) {
    const currentFilePath = batch[entryIndex]!;

    if (result.status === 'fulfilled') {
      successes.push(result.value);
      logFileResult(result.value, isBatch, options);
    } else {
      const errorMessage =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);

      failures.push({ error: errorMessage, filePath: currentFilePath });
      logger.error(`Failed: ${currentFilePath} — ${errorMessage}`);
    }
  }
};

const logSummary = (
  totalFiles: number,
  successes: FileSuccess[],
  failures: FileFailure[],
): void => {
  const highConfidence = successes.filter(
    (s) => !s.result.reviewRequired,
  ).length;
  const reviewRequired = successes.filter(
    (s) => s.result.reviewRequired,
  ).length;

  logger.info('\n=== Extraction Summary ===');
  logger.info(`Total files: ${String(totalFiles)}`);
  logger.info(`Successful: ${String(successes.length)}`);
  logger.info(`  - High confidence: ${String(highConfidence)}`);
  logger.info(`  - Review required: ${String(reviewRequired)}`);
  logger.info(`Failed: ${String(failures.length)}`);
};

export const handleExtract = async (
  filePaths: string[],
  options: ExtractOptions,
): Promise<void> => {
  const resolvedPaths = await resolveInputFilePaths(filePaths);
  const isInteractive = filePaths.length === 0;
  const documentType = await resolveDocumentType(
    options.documentType,
    isInteractive,
  );

  const layouts =
    documentType === undefined
      ? undefined
      : resolveLayouts(options.layout, documentType);

  const documentExtractor = createDocumentExtractor(textExtractor);
  const { concurrency } = options;

  const successes: FileSuccess[] = [];
  const failures: FileFailure[] = [];

  const processSingleFile = async (filePath: string): Promise<FileSuccess> => {
    const s3Uri = parseS3Uri(filePath);
    const textExtractionInput = s3Uri
      ? { s3Bucket: s3Uri.bucket, s3Key: s3Uri.key }
      : { filePath };

    if (documentType === undefined) {
      logger.info(`Extracting (auto-detect): ${filePath}`);
    } else {
      logger.info(
        `Extracting: ${documentType}, layouts: ${layouts?.join(', ') ?? 'auto'}`,
      );
    }

    const result = await documentExtractor.extract(textExtractionInput, {
      documentType,
      layouts,
    });

    if (result.layoutId) {
      logger.info(`Selected layout: ${result.layoutId}`);
    }

    if (!documentType) {
      logger.info(`Detected document type: ${result.data.documentType}`);
    }

    return { filePath, result };
  };

  const isBatch = resolvedPaths.length > 1;
  const totalBatches = Math.ceil(resolvedPaths.length / concurrency);

  for (let index = 0; index < resolvedPaths.length; index += concurrency) {
    const batch = resolvedPaths.slice(index, index + concurrency);
    const batchNumber = Math.floor(index / concurrency) + 1;

    if (isBatch) {
      logger.info(
        `Processing batch ${String(batchNumber)}/${String(totalBatches)} (${String(batch.length)} files)...`,
      );
    }

    const settled = await Promise.allSettled(
      batch.map((fp) => processSingleFile(fp)),
    );

    processBatchResults(settled, batch, successes, failures, isBatch, options);
  }

  if (isBatch) {
    logSummary(resolvedPaths.length, successes, failures);
  }

  if (failures.length > 0) {
    await writeFailuresFile(failures, options.outputFailures);
  }

  if (successes.some((s) => s.result.reviewRequired)) {
    process.exitCode = 2;
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
};
