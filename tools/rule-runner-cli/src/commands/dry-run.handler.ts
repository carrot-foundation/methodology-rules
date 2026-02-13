import { formatAsJson } from '@carrot-fndn/shared/cli';
import { logger } from '@carrot-fndn/shared/helpers';
import path from 'node:path';

import type { DryRunOptions } from './dry-run.command';

import { formatAsHuman } from '../formatters/human.formatter';
import { parseConfig } from '../utils/config-parser';
import { loadProcessor } from '../utils/processor-loader';
import { buildRuleInput } from '../utils/rule-input.builder';
import {
  type DryRunPrepareResponse,
  prepareDryRun,
} from '../utils/smaug-client';

const resolveProcessorPath = (rule: {
  ruleScope: string;
  ruleSlug: string;
}): string => {
  const scopeDirectory = rule.ruleScope.toLowerCase().replaceAll('_', '-');

  return `libs/methodologies/bold/rule-processors/${scopeDirectory}/${rule.ruleSlug}`;
};

const executeRule = async (
  rule: { ruleName: string; ruleSlug: string },
  resolvedPath: string,
  prepared: DryRunPrepareResponse,
  documentKeyPrefix: string,
  config: Record<string, unknown> | undefined,
  options: DryRunOptions,
): Promise<void> => {
  logger.info(`\n--- Running: ${rule.ruleName} (${rule.ruleSlug}) ---`);
  logger.info(`Processor path: ${resolvedPath}`);

  const processor = await loadProcessor(resolvedPath, config);

  const ruleInput = buildRuleInput({
    documentId: prepared.auditDocumentId,
    documentKeyPrefix,
    parentDocumentId: prepared.auditedDocumentId,
  });

  const startTime = Date.now();
  const result = await processor.process(ruleInput);
  const elapsedMs = Date.now() - startTime;

  if (options.json) {
    logger.info(formatAsJson(result));
  } else {
    logger.info(formatAsHuman(result, { debug: options.debug, elapsedMs }));
  }
};

export const handleDryRun = async (
  processorPath: string | undefined,
  options: DryRunOptions,
): Promise<void> => {
  logger.info(
    `DOCUMENT_BUCKET_NAME=${process.env['DOCUMENT_BUCKET_NAME'] ?? '(not set)'}`,
  );

  if (options.cache !== false) {
    process.env['TEXTRACT_CACHE_DIR'] = path.resolve(
      __dirname,
      '../../../document-extractor-cli/data/cache',
    );
    logger.info(`Textract cache enabled: ${process.env['TEXTRACT_CACHE_DIR']}`);
  }

  if (options.debug) {
    process.env['DEBUG'] = 'true';
  }

  const smaugUrl = options.smaugUrl ?? process.env['AUDIT_URL'];

  if (!smaugUrl) {
    throw new Error(
      'Smaug URL not set. Use --smaug-url or set AUDIT_URL env var.',
    );
  }

  const prepared: DryRunPrepareResponse = await prepareDryRun(smaugUrl, {
    documentId: options.documentId,
    methodologySlug: options.methodologySlug,
    ...(options.ruleSlug && { ruleSlug: options.ruleSlug }),
    rulesScope: options.rulesScope,
  });

  logger.info(`Dry-run prepared: executionId=${prepared.executionId}`);
  logger.info(
    `Rules to run: ${prepared.rules.map((r) => r.ruleSlug).join(', ')}`,
  );

  const documentKeyPrefix = `${prepared.executionId}/documents`;
  const config = parseConfig(options.config);

  for (const rule of prepared.rules) {
    const resolvedPath = processorPath ?? resolveProcessorPath(rule);

    try {
      await executeRule(
        rule,
        resolvedPath,
        prepared,
        documentKeyPrefix,
        config,
        options,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error(`Rule ${rule.ruleSlug} failed: ${message}`);

      if (options.debug && error instanceof Error) {
        logger.error(error.stack ?? '');
      }
    }
  }
};
