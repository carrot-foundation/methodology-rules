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
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { RuleResultEntry } from '../utils/batch-summary';
import type { RunOptions } from './run.command';

import { formatAsHuman } from '../formatters/human.formatter';
import {
  appendBreakdown,
  buildReasonCodeBreakdown,
  writeJsonLog,
} from '../utils/batch-summary';
import { parseConfig } from '../utils/config-parser';
import { loadProcessor } from '../utils/processor-loader';
import { buildRuleInput } from '../utils/rule-input.builder';

interface EntryRuleResult extends RuleResultEntry {
  entry: InputEntry;
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

const logBatchSummary = (
  total: number,
  passed: number,
  reviewRequired: number,
  failedRule: number,
  errors: number,
  reviewRequiredResults: EntryRuleResult[],
  ruleFailures: EntryRuleResult[],
): void => {
  const reviewRequiredBreakdown = buildReasonCodeBreakdown(
    reviewRequiredResults,
    'reviewReasons',
  );
  const failedBreakdown = buildReasonCodeBreakdown(ruleFailures, 'failReasons');

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

  logBatchSummary(
    entries.length,
    passedCount,
    reviewRequiredCount,
    failedRuleCount,
    failures.length,
    reviewRequiredResults,
    ruleFailures,
  );

  if (failures.length > 0) {
    const data = failures.map((f) => ({
      auditDocumentId: f.item.auditDocumentId,
      auditedDocumentId: f.item.auditedDocumentId,
      error: f.error,
      methodologyExecutionId: f.item.methodologyExecutionId,
    }));

    await writeJsonLog(data, 'rule-errors', options.outputFailures);
  }

  if (ruleFailures.length > 0) {
    const data = ruleFailures.map((f) => ({
      auditDocumentId: f.entry.auditDocumentId,
      auditedDocumentId: f.entry.auditedDocumentId,
      methodologyExecutionId: f.entry.methodologyExecutionId,
      resultComment: f.resultComment,
      resultContent: f.resultContent,
      resultStatus: f.resultStatus,
    }));

    await writeJsonLog(data, 'rule-failures');
  }

  if (reviewRequiredResults.length > 0) {
    const data = reviewRequiredResults.map((f) => ({
      auditDocumentId: f.entry.auditDocumentId,
      auditedDocumentId: f.entry.auditedDocumentId,
      methodologyExecutionId: f.entry.methodologyExecutionId,
      resultComment: f.resultComment,
      resultContent: f.resultContent,
      resultStatus: f.resultStatus,
    }));

    await writeJsonLog(data, 'review-required');
  }

  if (failures.length > 0 || failedRuleCount > 0) {
    process.exitCode = 1;
  }
};
