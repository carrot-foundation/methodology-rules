import {
  bold,
  green,
  processBatch,
  red,
  yellow,
} from '@carrot-fndn/shared/cli';
import { logger } from '@carrot-fndn/shared/helpers';
import { readFile } from 'node:fs/promises';

import type { RuleResultEntry } from '../utils/batch-summary';
import type { DryRunOptions } from './dry-run.command';
import type { DryRunDocumentResult, DryRunRuleResult } from './dry-run.handler';

import {
  appendBreakdown,
  buildReasonCodeBreakdown,
  writeJsonLog,
} from '../utils/batch-summary';
import { parseConfig } from '../utils/config-parser';
import {
  processDryRunDocument,
  resolveDryRunEnvironment,
} from './dry-run.handler';

const readDocumentIds = async (filePath: string): Promise<string[]> => {
  const content = await readFile(filePath, 'utf8');
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new TypeError(
      `Input file must contain a JSON array, got ${typeof parsed}`,
    );
  }

  for (const [index, entry] of (parsed as unknown[]).entries()) {
    if (typeof entry !== 'string') {
      throw new TypeError(
        `Entry at index ${String(index)} must be a string document ID, got ${typeof entry}`,
      );
    }
  }

  return parsed as string[];
};

const toRuleResultEntry = (ruleResult: DryRunRuleResult): RuleResultEntry => ({
  resultComment: ruleResult.resultComment,
  resultContent: ruleResult.resultContent,
  resultStatus: ruleResult.status,
});

export const handleDryRunBatch = async (
  processorPath: string | undefined,
  options: DryRunOptions,
): Promise<void> => {
  if (!options.inputFile) {
    throw new Error('--input-file is required for batch mode');
  }

  const { smaugUrl } = resolveDryRunEnvironment(options);
  const config = parseConfig(options.config);
  const documentIds = await readDocumentIds(options.inputFile);

  logger.info(
    `Input file: ${options.inputFile} (${String(documentIds.length)} documents)`,
  );
  logger.info(`Concurrency: ${String(options.concurrency)}`);

  const context = {
    config,
    methodologySlug: options.methodologySlug,
    options,
    processorPath,
    ruleSlug: options.ruleSlug,
    rulesScope: options.rulesScope,
    smaugUrl,
  };

  let passedCount = 0;
  let reviewRequiredCount = 0;
  let failedCount = 0;
  let ruleErrorCount = 0;
  const reviewRequiredResults: Array<{
    documentId: string;
    ruleResult: DryRunRuleResult;
  }> = [];
  const ruleFailures: Array<{
    documentId: string;
    ruleResult: DryRunRuleResult;
  }> = [];

  const { failures } = await processBatch<string, DryRunDocumentResult>({
    concurrency: options.concurrency,
    items: documentIds,
    onBatchStart: (batchNumber, totalBatches, batchSize) => {
      logger.info(
        `Processing batch ${String(batchNumber)}/${String(totalBatches)} (${String(batchSize)} documents)...`,
      );
    },
    onItemFailure: (documentId, error) => {
      logger.error(`Error [${documentId}]: ${error}`);
    },
    onItemSuccess: (_documentId, result) => {
      for (const ruleResult of result.ruleResults) {
        switch (ruleResult.status) {
          case 'error': {
            ruleErrorCount++;
            break;
          }

          case 'failed': {
            failedCount++;
            ruleFailures.push({
              documentId: result.documentId,
              ruleResult,
            });
            break;
          }

          case 'passed': {
            passedCount++;
            break;
          }

          case 'review_required': {
            reviewRequiredCount++;
            reviewRequiredResults.push({
              documentId: result.documentId,
              ruleResult,
            });
            break;
          }
        }
      }
    },
    processItem: async (documentId): Promise<DryRunDocumentResult> =>
      processDryRunDocument(documentId, context),
  });

  const reviewRequiredBreakdown = buildReasonCodeBreakdown(
    reviewRequiredResults.map((r) => toRuleResultEntry(r.ruleResult)),
    'reviewReasons',
  );
  const failedBreakdown = buildReasonCodeBreakdown(
    ruleFailures.map((r) => toRuleResultEntry(r.ruleResult)),
    'failReasons',
  );

  const totalRules =
    passedCount + reviewRequiredCount + failedCount + ruleErrorCount;

  const lines: string[] = [
    bold('=== Dry-Run Batch Summary ==='),
    `Total documents: ${String(documentIds.length)}`,
    `Total rules executed: ${String(totalRules)}`,
    green(`Passed: ${String(passedCount)}`),
    yellow(`Review required: ${String(reviewRequiredCount)}`),
    yellow(`Failed (rule): ${String(failedCount)}`),
    red(`Rule errors: ${String(ruleErrorCount)}`),
    red(`Document errors: ${String(failures.length)}`),
  ];

  appendBreakdown(
    lines,
    'Review Reason Codes (Review Required):',
    reviewRequiredBreakdown,
    yellow,
  );
  appendBreakdown(lines, 'Review Reason Codes (Failed):', failedBreakdown, red);

  logger.info(`\n${lines.join('\n')}`);

  if (ruleFailures.length > 0) {
    const data = ruleFailures.map((f) => ({
      documentId: f.documentId,
      resultComment: f.ruleResult.resultComment,
      resultContent: f.ruleResult.resultContent,
      resultStatus: f.ruleResult.status,
      ruleSlug: f.ruleResult.ruleSlug,
    }));

    await writeJsonLog(data, 'rule-failures');
  }

  if (reviewRequiredResults.length > 0) {
    const data = reviewRequiredResults.map((f) => ({
      documentId: f.documentId,
      resultComment: f.ruleResult.resultComment,
      resultContent: f.ruleResult.resultContent,
      resultStatus: f.ruleResult.status,
      ruleSlug: f.ruleResult.ruleSlug,
    }));

    await writeJsonLog(data, 'review-required');
  }

  if (failures.length > 0 || failedCount > 0 || ruleErrorCount > 0) {
    process.exitCode = 1;
  }
};
