import type { Command } from '@commander-js/extra-typings';

import { logger } from '@carrot-fndn/shared/helpers';

export const runProgram = async (program: Command): Promise<void> => {
  try {
    await program.parseAsync();
  } catch (error) {
    logger.fatal(error, 'Fatal error');
    process.exitCode = 1;
  }
};
