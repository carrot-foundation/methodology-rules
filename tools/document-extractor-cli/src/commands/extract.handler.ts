import { bold, green, red, yellow } from '@carrot-fndn/shared/cli';
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
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { formatAsHuman } from '../formatters/human.formatter';
import { formatAsJson } from '../formatters/json.formatter';
import { resolveFilePaths } from '../utils/file-resolver';
import { parseS3Uri } from '../utils/s3-uri.parser';
import { promptForDocumentType, promptForFilePath } from './extract.prompts';

const LOGS_DIR = path.resolve(__dirname, '../../logs');

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

const groupByTypeAndLayout = (items: FileSuccess[]): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const type = item.result.data.documentType;
    const layout = item.result.layoutId ?? 'unknown';
    const key = `${type} / ${layout}`;

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
};

const groupReviewReasons = (items: FileSuccess[]): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const reason of item.result.reviewReasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  return counts;
};

const writeFailuresJson = async (
  failures: FileFailure[],
  outputPath: string | undefined,
): Promise<void> => {
  const timestamp = new Date().toISOString().replaceAll(':', '-');

  await mkdir(LOGS_DIR, { recursive: true });

  const failurePath =
    outputPath ?? path.join(LOGS_DIR, `extraction-failures-${timestamp}.json`);

  const data = failures.map((f) => ({
    error: f.error,
    filePath: f.filePath,
  }));

  await writeFile(failurePath, JSON.stringify(data, null, 2), 'utf8');

  logger.info(`Failures JSON written to: ${failurePath}`);
};

const writeReviewRequiredJson = async (items: FileSuccess[]): Promise<void> => {
  const timestamp = new Date().toISOString().replaceAll(':', '-');

  await mkdir(LOGS_DIR, { recursive: true });

  const filePath = path.join(
    LOGS_DIR,
    `extraction-review-required-${timestamp}.json`,
  );

  const data = items.map((item) => ({
    documentType: item.result.data.documentType,
    filePath: item.filePath,
    layoutId: item.result.layoutId,
    reviewReasons: item.result.reviewReasons,
  }));

  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

  logger.info(`Review-required JSON written to: ${filePath}`);
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

const formatBreakdown = (items: FileSuccess[]): string => {
  const lines: string[] = [];

  for (const [key, count] of groupByTypeAndLayout(items)) {
    lines.push(`  ${key}: ${String(count)}`);
  }

  return lines.join('\n');
};

const logSummary = (
  totalFiles: number,
  successes: FileSuccess[],
  failures: FileFailure[],
): void => {
  const highConfidence = successes.filter((s) => !s.result.reviewRequired);
  const reviewRequired = successes.filter((s) => s.result.reviewRequired);

  const lines: string[] = [
    bold('=== Extraction Summary ==='),
    `Total files: ${String(totalFiles)}`,
    '',
    green(`Successful (high confidence): ${String(highConfidence.length)}`),
    formatBreakdown(highConfidence),
    '',
    yellow(`Review required: ${String(reviewRequired.length)}`),
    formatBreakdown(reviewRequired),
  ];

  if (reviewRequired.length > 0) {
    const reasons = [...groupReviewReasons(reviewRequired)].sort(
      (a, b) => b[1] - a[1],
    );

    lines.push('  Reasons:');

    for (const [reason, count] of reasons) {
      lines.push(`    ${String(count)} × ${reason}`);
    }
  }

  lines.push('', red(`Failed: ${String(failures.length)}`));

  logger.info(`\n${lines.join('\n')}`);
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

  if (isBatch && failures.length > 0) {
    await writeFailuresJson(failures, options.outputFailures);
  }

  const reviewRequiredItems = successes.filter((s) => s.result.reviewRequired);

  if (isBatch && reviewRequiredItems.length > 0) {
    await writeReviewRequiredJson(reviewRequiredItems);
  }

  if (reviewRequiredItems.length > 0) {
    process.exitCode = 2;
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
};
