import { handleCommandError } from '@carrot-fndn/shared/cli';
import {
  Argument,
  Command,
  InvalidArgumentError,
  Option,
} from '@commander-js/extra-typings';

import { handleRunBatch } from './run-batch.handler';
import { handleRun } from './run.handler';

export interface RunOptions {
  auditDocumentId?: string | undefined;
  auditedDocumentId?: string | undefined;
  cache: boolean;
  concurrency: number;
  config?: string | undefined;
  debug: boolean;
  envFile?: string | undefined;
  inputFile?: string | undefined;
  json: boolean;
  methodologyExecutionId?: string | undefined;
  outputFailures?: string | undefined;
}

const parseConcurrency = (value: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    throw new InvalidArgumentError('Must be a positive integer.');
  }

  return parsed;
};

export const runCommand = new Command('run')
  .description('Run a rule processor against real S3 data')
  .addArgument(
    new Argument(
      '<processor-path>',
      'Path to the rule processor directory (e.g., libs/methodologies/bold/rule-processors/mass-id/project-boundary)',
    ),
  )
  .addOption(
    new Option(
      '--methodology-execution-id <id>',
      'Methodology execution ID (combined with /documents to form S3 prefix)',
    ),
  )
  .addOption(
    new Option(
      '--audit-document-id <id>',
      'Audit document ID (maps to documentId in RuleInput)',
    ),
  )
  .addOption(
    new Option(
      '--audited-document-id <id>',
      'Audited document ID, e.g. the MassID (maps to parentDocumentId in RuleInput)',
    ),
  )
  .addOption(
    new Option(
      '--input-file <path>',
      'JSON file with array of documents for batch processing',
    ),
  )
  .addOption(
    new Option(
      '--concurrency <n>',
      'Number of parallel documents in batch mode',
    )
      .default(5)
      .argParser(parseConcurrency),
  )
  .addOption(new Option('--config <json>', 'Processor config as JSON string'))
  .addOption(
    new Option(
      '--output-failures <path>',
      'Custom path for the errors JSON file (batch mode only)',
    ),
  )
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
  .option('--no-cache', 'Disable Textract output caching')
  .action(async (processorPath: string, options: RunOptions) => {
    try {
      if (options.inputFile) {
        await handleRunBatch(processorPath, options);
      } else {
        if (
          !options.methodologyExecutionId ||
          !options.auditDocumentId ||
          !options.auditedDocumentId
        ) {
          throw new Error(
            'Single-document mode requires --methodology-execution-id, --audit-document-id, and --audited-document-id',
          );
        }

        await handleRun(processorPath, {
          ...options,
          auditDocumentId: options.auditDocumentId,
          auditedDocumentId: options.auditedDocumentId,
          methodologyExecutionId: options.methodologyExecutionId,
        });
      }
    } catch (error) {
      handleCommandError(error, { verbose: options.debug });
    }
  });
