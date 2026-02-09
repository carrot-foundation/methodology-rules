import './utils/parser-imports';

import { logger } from '@carrot-fndn/shared/helpers';
import { Command } from '@commander-js/extra-typings';

import { extractCommand } from './commands/extract.command';
import { listLayoutsCommand } from './commands/list-layouts.command';

const program = new Command('document-extractor')
  .description('Extract data from documents using registered parsers')
  .version('1.0.0');

program.addCommand(extractCommand, { isDefault: true });
program.addCommand(listLayoutsCommand);

void (async () => {
  try {
    await program.parseAsync();
  } catch (error) {
    logger.fatal(error, 'Fatal error');
    process.exitCode = 1;
  }
})();
