import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import {
  bold,
  formatAsJson,
  green,
  processBatch,
  red,
  yellow,
} from '@carrot-fndn/shared/cli';
import { logger } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { RunOptions } from './run.command';

import { formatAsHuman } from '../formatters/human.formatter';
import { parseConfig } from '../utils/config-parser';
import { loadProcessor } from '../utils/processor-loader';
import { buildRuleInput } from '../utils/rule-input.builder';

interface EntryRuleResult {
  entry: InputEntry;
  resultComment?: string | undefined;
  resultContent?: Record<string, unknown> | undefined;
  resultStatus: string;
}

interface InputEntry {
  auditDocumentId: string;
  auditedDocumentId: string;
  methodologyExecutionId: string;
}

interface ProcessResult {
  elapsedMs: number;
  output: RuleOutput;
}

const LOGS_DIR = path.resolve(__dirname, '../../logs');

const writeErrorsJson = async (
  failures: Array<{ error: string; item: InputEntry }>,
  outputPath: string | undefined,
): Promise<void> => {
  const timestamp = new Date().toISOString().replaceAll(':', '-');

  await mkdir(LOGS_DIR, { recursive: true });

  const filePath =
    outputPath ?? path.join(LOGS_DIR, `rule-errors-${timestamp}.json`);

  const data = failures.map((f) => ({
    auditDocumentId: f.item.auditDocumentId,
    auditedDocumentId: f.item.auditedDocumentId,
    error: f.error,
    methodologyExecutionId: f.item.methodologyExecutionId,
  }));

  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

  logger.info(`Errors JSON written to: ${filePath}`);
};

const writeRuleResultsJson = async (
  results: EntryRuleResult[],
  prefix: string,
): Promise<void> => {
  const timestamp = new Date().toISOString().replaceAll(':', '-');

  await mkdir(LOGS_DIR, { recursive: true });

  const filePath = path.join(LOGS_DIR, `${prefix}-${timestamp}.json`);

  const data = results.map((f) => ({
    auditDocumentId: f.entry.auditDocumentId,
    auditedDocumentId: f.entry.auditedDocumentId,
    methodologyExecutionId: f.entry.methodologyExecutionId,
    resultComment: f.resultComment,
    resultContent: f.resultContent,
    resultStatus: f.resultStatus,
  }));

  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

  logger.info(`${prefix} JSON written to: ${filePath}`);
};

const readInputFile = async (filePath: string): Promise<InputEntry[]> => {
  const content = await readFile(filePath, 'utf8');
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new TypeError(
      `Input file must contain a JSON array, got ${typeof parsed}`,
    );
  }

  for (const [index, entry] of (parsed as unknown[]).entries()) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('methodologyExecutionId' in entry) ||
      !('auditDocumentId' in entry) ||
      !('auditedDocumentId' in entry)
    ) {
      throw new Error(
        `Entry at index ${String(index)} must have methodologyExecutionId, auditDocumentId, and auditedDocumentId`,
      );
    }
  }

  return parsed as InputEntry[];
};

interface ReviewReasonCodeBreakdown {
  code: string;
  count: number;
}

const buildReasonCodeBreakdown = (
  results: EntryRuleResult[],
  field: 'failReasons' | 'reviewReasons',
): ReviewReasonCodeBreakdown[] => {
  const codeCounts = new Map<string, number>();

  for (const result of results) {
    const reasons = result.resultContent?.[field];

    if (!Array.isArray(reasons)) {
      continue;
    }

    for (const reason of reasons as unknown[]) {
      if (
        typeof reason === 'object' &&
        reason !== null &&
        'code' in reason &&
        typeof (reason as { code: unknown }).code === 'string'
      ) {
        const code = (reason as { code: string }).code;

        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      }
    }
  }

  return [...codeCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
};

const appendBreakdown = (
  lines: string[],
  title: string,
  breakdown: ReviewReasonCodeBreakdown[],
  color: (text: string) => string,
): void => {
  if (breakdown.length === 0) {
    return;
  }

  lines.push('', bold(title));

  for (const { code, count } of breakdown) {
    lines.push(color(`  ${code}: ${String(count)}`));
  }
};

const logBatchSummary = (
  total: number,
  passed: number,
  reviewRequired: number,
  failedRule: number,
  errors: number,
  reviewRequiredBreakdown: ReviewReasonCodeBreakdown[],
  failedBreakdown: ReviewReasonCodeBreakdown[],
): void => {
  const lines: string[] = [
    bold('=== Batch Execution Summary ==='),
    `Total documents: ${String(total)}`,
    green(`Passed: ${String(passed)}`),
    yellow(`Review required: ${String(reviewRequired)}`),
    yellow(`Failed (rule): ${String(failedRule)}`),
    red(`Errors: ${String(errors)}`),
  ];

  appendBreakdown(
    lines,
    'Review Reason Codes (Review Required):',
    reviewRequiredBreakdown,
    yellow,
  );
  appendBreakdown(lines, 'Review Reason Codes (Failed):', failedBreakdown, red);

  logger.info(`\n${lines.join('\n')}`);
};

export const handleRunBatch = async (
  processorPath: string,
  options: RunOptions,
): Promise<void> => {
  if (!options.inputFile) {
    throw new Error('--input-file is required for batch mode');
  }

  logger.info(
    `DOCUMENT_BUCKET_NAME=${process.env['DOCUMENT_BUCKET_NAME'] ?? '(not set)'}`,
  );
  logger.info(
    `DOCUMENT_ATTACHMENT_BUCKET_NAME=${process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] ?? '(not set)'}`,
  );

  if (options.cache !== false) {
    process.env['TEXTRACT_CACHE_DIR'] = path.resolve(
      __dirname,
      '../../../document-extractor-cli/data/cache',
    );
    logger.info(`Textract cache enabled: ${process.env['TEXTRACT_CACHE_DIR']}`);
  }

  const config = parseConfig(options.config);
  const processor = await loadProcessor(processorPath, config);
  const entries = await readInputFile(options.inputFile);

  logger.info(`Running processor from: ${processorPath}`);
  logger.info(
    `Input file: ${options.inputFile} (${String(entries.length)} documents)`,
  );
  logger.info(`Concurrency: ${String(options.concurrency)}`);

  if (config) {
    logger.info(`Config: ${JSON.stringify(config)}`);
  }

  if (options.debug) {
    process.env['DEBUG'] = 'true';
  }

  let passedCount = 0;
  let reviewRequiredCount = 0;
  let failedRuleCount = 0;
  const ruleFailures: EntryRuleResult[] = [];
  const reviewRequiredResults: EntryRuleResult[] = [];

  const { failures } = await processBatch<InputEntry, ProcessResult>({
    concurrency: options.concurrency,
    items: entries,
    onBatchStart: (batchNumber, totalBatches, batchSize) => {
      logger.info(
        `Processing batch ${String(batchNumber)}/${String(totalBatches)} (${String(batchSize)} documents)...`,
      );
    },
    onItemFailure: (entry, error) => {
      logger.error(`Error [${entry.methodologyExecutionId}]: ${error}`);
    },
    onItemSuccess: (entry, { elapsedMs, output }) => {
      if (output.resultStatus === RuleOutputStatus.PASSED) {
        passedCount++;
      } else if (output.resultStatus === RuleOutputStatus.REVIEW_REQUIRED) {
        reviewRequiredCount++;
        reviewRequiredResults.push({
          entry,
          resultComment: output.resultComment,
          resultContent: output.resultContent,
          resultStatus: output.resultStatus,
        });
      } else {
        failedRuleCount++;
        ruleFailures.push({
          entry,
          resultComment: output.resultComment,
          resultContent: output.resultContent,
          resultStatus: output.resultStatus,
        });
      }

      if (options.json) {
        logger.info(
          formatAsJson({
            auditDocumentId: entry.auditDocumentId,
            auditedDocumentId: entry.auditedDocumentId,
            methodologyExecutionId: entry.methodologyExecutionId,
            result: output,
          }),
        );
      } else {
        logger.info(`--- ${entry.methodologyExecutionId} ---`);
        logger.info(formatAsHuman(output, { debug: options.debug, elapsedMs }));
      }
    },
    processItem: async (entry): Promise<ProcessResult> => {
      const documentKeyPrefix = `${entry.methodologyExecutionId}/documents`;

      const ruleInput = buildRuleInput({
        documentId: entry.auditDocumentId,
        documentKeyPrefix,
        parentDocumentId: entry.auditedDocumentId,
      });

      const startTime = Date.now();
      const output = await processor.process(ruleInput);
      const elapsedMs = Date.now() - startTime;

      return { elapsedMs, output };
    },
  });

  const reviewRequiredBreakdown = buildReasonCodeBreakdown(
    reviewRequiredResults,
    'reviewReasons',
  );
  const failedBreakdown = buildReasonCodeBreakdown(ruleFailures, 'failReasons');

  logBatchSummary(
    entries.length,
    passedCount,
    reviewRequiredCount,
    failedRuleCount,
    failures.length,
    reviewRequiredBreakdown,
    failedBreakdown,
  );

  if (failures.length > 0) {
    await writeErrorsJson(failures, options.outputFailures);
  }

  if (ruleFailures.length > 0) {
    await writeRuleResultsJson(ruleFailures, 'rule-failures');
  }

  if (reviewRequiredResults.length > 0) {
    await writeRuleResultsJson(reviewRequiredResults, 'review-required');
  }

  if (failures.length > 0 || failedRuleCount > 0) {
    process.exitCode = 1;
  }
};
