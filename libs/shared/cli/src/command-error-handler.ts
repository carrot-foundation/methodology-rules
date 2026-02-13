import { logger } from '@carrot-fndn/shared/helpers';

export const handleCommandError = (
  error: unknown,
  options?: { verbose?: boolean },
): void => {
  logger.error(error instanceof Error ? error.message : error, 'Error');

  if (options?.verbose === true && error instanceof Error) {
    logger.error(error.stack, 'Stack trace');
  }

  process.exitCode = 1;
};
