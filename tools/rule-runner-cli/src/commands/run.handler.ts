import type { MethodologyDocument } from '@carrot-fndn/shared/types';

import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { logger, toDocumentKey } from '@carrot-fndn/shared/helpers';

import type { RunOptions } from './run.command';

import { formatAsHuman } from '../formatters/human.formatter';
import { formatAsJson } from '../formatters/json.formatter';
import { loadProcessor } from '../utils/processor-loader';
import { buildRuleInput } from '../utils/rule-input.builder';

const parseConfig = (
  configString: string | undefined,
): Record<string, unknown> | undefined => {
  if (!configString) {
    return undefined;
  }

  try {
    return JSON.parse(configString) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid --config JSON: ${configString}`);
  }
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
  options: RunOptions,
): Promise<void> => {
  logger.info(
    `DOCUMENT_BUCKET_NAME=${process.env['DOCUMENT_BUCKET_NAME'] ?? '(not set)'}`,
  );
  logger.info(
    `DOCUMENT_ATTACHMENT_BUCKET_NAME=${process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] ?? '(not set)'}`,
  );

  const config = parseConfig(options.config);
  const processor = await loadProcessor(processorPath, config);

  const ruleInput = buildRuleInput({
    documentId: options.auditDocumentId,
    documentKeyPrefix: options.documentKeyPrefix,
    parentDocumentId: options.auditedDocumentId,
  });

  logger.info(`Running processor from: ${processorPath}`);
  logger.info(
    `Audit document: ${options.documentKeyPrefix}/${options.auditDocumentId}`,
  );

  logger.info(
    `Audited document: ${options.documentKeyPrefix}/${options.auditedDocumentId}`,
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
      options.documentKeyPrefix,
    );
    await logDocumentDetails(
      'Audited document',
      options.auditedDocumentId,
      options.documentKeyPrefix,
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
