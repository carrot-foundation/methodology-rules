import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { formatAsJson } from '@carrot-fndn/shared/cli';
import { logger } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
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

export interface DryRunDocumentResult {
  documentId: string;
  ruleResults: DryRunRuleResult[];
}

export interface DryRunRuleResult {
  error?: string | undefined;
  resultComment?: string | undefined;
  resultContent?: Record<string, unknown> | undefined;
  ruleSlug: string;
  status: 'error' | 'failed' | 'passed' | 'review_required';
}

export const resolveProcessorPath = (rule: {
  ruleScope: string;
  ruleSlug: string;
}): string => {
  const scopeDirectory = rule.ruleScope
    .replaceAll(/\s+/g, '-')
    .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  return `libs/methodologies/bold/rule-processors/${scopeDirectory}/${rule.ruleSlug}`;
};

export const executeRule = async (
  rule: { ruleName: string; ruleSlug: string },
  resolvedPath: string,
  prepared: DryRunPrepareResponse,
  documentKeyPrefix: string,
  config: Record<string, unknown> | undefined,
  options: DryRunOptions,
): Promise<RuleOutput> => {
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

  return result;
};

export const resolveDryRunEnvironment = (
  options: Pick<DryRunOptions, 'cache' | 'debug' | 'smaugUrl'>,
): { smaugUrl: string } => {
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

  return { smaugUrl };
};

const mapOutputStatus = (
  status: RuleOutputStatus,
): DryRunRuleResult['status'] => {
  switch (status) {
    case RuleOutputStatus.FAILED: {
      return 'failed';
    }

    case RuleOutputStatus.PASSED: {
      return 'passed';
    }

    case RuleOutputStatus.REVIEW_REQUIRED: {
      return 'review_required';
    }
  }
};

export const processDryRunDocument = async (
  documentId: string,
  context: {
    config: Record<string, unknown> | undefined;
    methodologySlug: string;
    options: DryRunOptions;
    processorPath: string | undefined;
    ruleSlug?: string | undefined;
    rulesScope: string;
    smaugUrl: string;
  },
): Promise<DryRunDocumentResult> => {
  const prepared: DryRunPrepareResponse = await prepareDryRun(
    context.smaugUrl,
    {
      documentId,
      methodologySlug: context.methodologySlug,
      ...(context.ruleSlug && { ruleSlug: context.ruleSlug }),
      rulesScope: context.rulesScope,
    },
  );

  logger.info(`Dry-run prepared: executionId=${prepared.executionId}`);
  logger.info(
    `Rules to run: ${prepared.rules.map((r) => r.ruleSlug).join(', ')}`,
  );

  const documentKeyPrefix = `${prepared.executionId}/documents`;
  const ruleResults: DryRunRuleResult[] = [];

  for (const rule of prepared.rules) {
    const resolvedPath = context.processorPath ?? resolveProcessorPath(rule);

    try {
      const output = await executeRule(
        rule,
        resolvedPath,
        prepared,
        documentKeyPrefix,
        context.config,
        context.options,
      );

      ruleResults.push({
        resultComment: output.resultComment,
        resultContent: output.resultContent,
        ruleSlug: rule.ruleSlug,
        status: mapOutputStatus(output.resultStatus),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error(`Rule ${rule.ruleSlug} failed: ${message}`);

      if (context.options.debug && error instanceof Error) {
        logger.error(error.stack ?? '');
      }

      ruleResults.push({
        error: message,
        ruleSlug: rule.ruleSlug,
        status: 'error',
      });
    }
  }

  return { documentId, ruleResults };
};

export const handleDryRun = async (
  processorPath: string | undefined,
  options: DryRunOptions & { documentId: string },
): Promise<DryRunDocumentResult> => {
  const { smaugUrl } = resolveDryRunEnvironment(options);
  const config = parseConfig(options.config);

  return processDryRunDocument(options.documentId, {
    config,
    methodologySlug: options.methodologySlug,
    options,
    processorPath,
    ruleSlug: options.ruleSlug,
    rulesScope: options.rulesScope,
    smaugUrl,
  });
};
