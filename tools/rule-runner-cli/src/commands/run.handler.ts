import type { MethodologyDocument } from '@carrot-fndn/shared/types';

import { formatAsJson } from '@carrot-fndn/shared/cli';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { logger, toDocumentKey } from '@carrot-fndn/shared/helpers';

import type { RunOptions } from './run.command';

import { formatAsHuman } from '../formatters/human.formatter';
import { parseConfig } from '../utils/config-parser';
import { loadProcessor } from '../utils/processor-loader';
import { buildRuleInput } from '../utils/rule-input.builder';

type SingleRunOptions = Omit<
  RunOptions,
  'auditDocumentId' | 'auditedDocumentId' | 'methodologyExecutionId'
> & {
  auditDocumentId: string;
  auditedDocumentId: string;
  methodologyExecutionId: string;
};

const logDocumentDetails = async (
  label: string,
  documentId: string,
  documentKeyPrefix: string,
): Promise<void> => {
  const key = toDocumentKey({ documentId, documentKeyPrefix });

  try {
    const entity = await provideDocumentLoaderService.load({ key });
    const document = entity.document as MethodologyDocument;

    const events = document.externalEvents ?? [];

    logger.debug(
      `[${label}] type=${document.type ?? 'N/A'} subtype=${document.subtype ?? 'N/A'}`,
    );
    logger.debug(`[${label}] externalEvents: ${String(events.length)}`);

    for (const event of events) {
      const eventLabel = event.label ? ` (label: ${event.label})` : '';

      logger.debug(`[${label}]   - ${event.name}${eventLabel}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    logger.warn(`[${label}] Failed to load document: ${message}`);
  }
};

export const handleRun = async (
  processorPath: string,
  options: SingleRunOptions,
): Promise<void> => {
  logger.info(
    `DOCUMENT_BUCKET_NAME=${process.env['DOCUMENT_BUCKET_NAME'] ?? '(not set)'}`,
  );
  logger.info(
    `DOCUMENT_ATTACHMENT_BUCKET_NAME=${process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] ?? '(not set)'}`,
  );

  const config = parseConfig(options.config);
  const processor = await loadProcessor(processorPath, config);

  const documentKeyPrefix = `${options.methodologyExecutionId}/documents`;

  const ruleInput = buildRuleInput({
    documentId: options.auditDocumentId,
    documentKeyPrefix,
    parentDocumentId: options.auditedDocumentId,
  });

  logger.info(`Running processor from: ${processorPath}`);
  logger.info(`Methodology execution: ${options.methodologyExecutionId}`);
  logger.info(
    `Audit document: ${documentKeyPrefix}/${options.auditDocumentId}`,
  );

  logger.info(
    `Audited document: ${documentKeyPrefix}/${options.auditedDocumentId}`,
  );

  if (config) {
    logger.info(`Config: ${JSON.stringify(config)}`);
  }

  if (options.debug) {
    process.env['DEBUG'] = 'true';
  }

  if (options.debug) {
    await logDocumentDetails(
      'Audit document',
      options.auditDocumentId,
      documentKeyPrefix,
    );
    await logDocumentDetails(
      'Audited document',
      options.auditedDocumentId,
      documentKeyPrefix,
    );
  }

  const startTime = Date.now();
  const result = await processor.process(ruleInput);
  const elapsedMs = Date.now() - startTime;

  if (options.json) {
    logger.info(formatAsJson(result));
  } else {
    logger.info(formatAsHuman(result, { debug: options.debug, elapsedMs }));
  }
};
