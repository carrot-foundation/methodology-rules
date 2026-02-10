import { logger } from '@carrot-fndn/shared/helpers';
import { Argument, Command, Option } from '@commander-js/extra-typings';

import { EXTRACT_OPTIONS } from './extract.constants';
import { handleExtract } from './extract.handler';

export const extractCommand = new Command('extract')
  .description('Extract data from documents using registered parsers')
  .addArgument(
    new Argument(
      '[file-paths...]',
      'File paths, glob patterns, directories, or .txt list files to process',
    ),
  )
  .addOption(
    new Option(
      EXTRACT_OPTIONS.documentType,
      'Document type to extract (omit to auto-detect)',
    ).choices([
      'scaleTicket',
      'transportManifest',
      'recyclingManifest',
    ] as const),
  )
  .option(
    EXTRACT_OPTIONS.layout,
    'Layout ID (e.g., layout-1, mtr-brazil, cdf-brazil)',
  )
  .option('--concurrency <n>', 'Number of files to process in parallel', '10')
  .option(
    '--output-failures <path>',
    'Path to write failed file list (defaults to ./extraction-failures-<timestamp>.txt)',
  )
  .option('--verbose', 'Show raw text and detailed info', false)
  .option('--json', 'Output as JSON', false)
  .action(async (filePaths, options) => {
    const verbose = options.verbose;

    try {
      await handleExtract(filePaths, {
        concurrency: Number(options.concurrency) || 10,
        documentType: options.documentType,
        json: options.json,
        layout: options.layout,
        outputFailures: options.outputFailures,
        verbose,
      });
    } catch (error) {
      logger.error(error instanceof Error ? error.message : error, 'Error');

      if (verbose && error instanceof Error) {
        logger.error(error.stack, 'Stack trace');
      }

      process.exitCode = 1;
    }
  });
