import { logger } from '@carrot-fndn/shared/helpers';
import { Argument, Command, Option } from '@commander-js/extra-typings';

import { handleRun } from './run.handler';

export interface RunOptions {
  auditDocumentId: string;
  auditedDocumentId: string;
  config?: string | undefined;
  debug: boolean;
  documentKeyPrefix: string;
  envFile?: string | undefined;
  json: boolean;
}

export const runCommand = new Command('run')
  .description('Run a rule processor against real S3 data')
  .addArgument(
    new Argument(
      '<processor-path>',
      'Path to the rule processor directory (e.g., libs/methodologies/bold/rule-processors/mass-id/project-boundary)',
    ),
  )
  .requiredOption('--document-key-prefix <prefix>', 'S3 document key prefix')
  .requiredOption(
    '--audit-document-id <id>',
    'Audit document ID (maps to documentId in RuleInput)',
  )
  .requiredOption(
    '--audited-document-id <id>',
    'Audited document ID, e.g. the MassID (maps to parentDocumentId in RuleInput)',
  )
  .addOption(new Option('--config <json>', 'Processor config as JSON string'))
  .addOption(
    new Option(
      '--env-file <path>',
      'Path to env file (default: .env-files/.env.test)',
    ),
  )
  .option(
    '--debug',
    'Show detailed output including document inspection',
    false,
  )
  .option('--json', 'Output as JSON', false)
  .action(async (processorPath: string, options: RunOptions) => {
    try {
      await handleRun(processorPath, options);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : error, 'Error');

      if (options.debug && error instanceof Error) {
        logger.error(error.stack, 'Stack trace');
      }

      process.exitCode = 1;
    }
  });
