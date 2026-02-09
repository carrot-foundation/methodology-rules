import { type DocumentType } from '@carrot-fndn/shared/document-extractor';
import { logger } from '@carrot-fndn/shared/helpers';
import { Argument, Command, Option } from '@commander-js/extra-typings';

import { EXTRACT_OPTIONS } from './extract.constants';
import { handleExtract } from './extract.handler';

interface ExtractOptions {
  documentType?: DocumentType;
  json: boolean;
  layout?: string;
  verbose: boolean;
}

export const extractCommand = new Command('extract')
  .description('Extract data from documents using registered parsers')
  .addArgument(
    new Argument('[file-paths...]', 'File paths or glob patterns to process'),
  )
  .addOption(
    new Option(
      EXTRACT_OPTIONS.documentType,
      'Document type to extract',
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
  .option('--verbose', 'Show raw text and detailed info', false)
  .option('--json', 'Output as JSON', false)
  .action(async (filePaths: string[], options: ExtractOptions) => {
    try {
      await handleExtract(filePaths, options);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : error, 'Error');

      if (options.verbose && error instanceof Error) {
        logger.error(error.stack, 'Stack trace');
      }

      process.exitCode = 1;
    }
  });
