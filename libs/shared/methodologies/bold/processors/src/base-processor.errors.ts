import { logger } from '@carrot-fndn/shared/helpers';
import * as Sentry from '@sentry/aws-serverless';

export interface ErrorMessage {
  [key: string]: ((...arguments_: never[]) => string) | string;
  FAILED_BY_ERROR: string;
}

export abstract class BaseProcessorErrors {
  abstract readonly ERROR_MESSAGE: ErrorMessage;

  protected readonly KNOWN_ERROR_PREFIX = String(Symbol('[KNOWN ERROR]: '));

  getKnownError(message: string): Error {
    return new Error(this.KNOWN_ERROR_PREFIX + message);
  }

  getResultCommentFromError(error: unknown): string {
    return this.processKnownError(error) || this.ERROR_MESSAGE.FAILED_BY_ERROR;
  }

  private getKnownErrorMessage(error: Error): string {
    return error.message.replace(this.KNOWN_ERROR_PREFIX, '');
  }

  private isKnownError(error: unknown): error is Error {
    return (
      error instanceof Error &&
      error.message.startsWith(this.KNOWN_ERROR_PREFIX)
    );
  }

  private processKnownError(error: unknown): string | undefined {
    if (this.isKnownError(error)) {
      return this.getKnownErrorMessage(error);
    }

    logger.error(error, 'Unexpected error on "processKnownError" method');
    Sentry.captureException(error);

    return undefined;
  }
}
