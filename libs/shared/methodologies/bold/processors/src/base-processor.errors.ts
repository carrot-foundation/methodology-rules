import type { RenderedRuleFinding } from '@carrot-fndn/shared/rule/result';
import type { RuleFinding } from '@carrot-fndn/shared/rule/types';

import { logger } from '@carrot-fndn/shared/helpers';
import * as Sentry from '@sentry/aws-serverless';

export interface ErrorMessage {
  [key: string]: ((...arguments_: never[]) => string) | string;
  FAILED_BY_ERROR: string;
}

interface FailedResultFromError {
  resultComment: string;
  resultFindings: RuleFinding[];
}

class KnownFindingError extends Error {
  constructor(
    message: string,
    readonly finding: RuleFinding,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export abstract class BaseProcessorErrors {
  abstract readonly ERROR_MESSAGE: ErrorMessage;

  protected readonly KNOWN_ERROR_PREFIX = String(Symbol('[KNOWN ERROR]: '));

  getFailedResultFromError(error: unknown): FailedResultFromError {
    const failedResult = this.processKnownError(error);

    if (failedResult === undefined) {
      throw error;
    }

    return failedResult;
  }

  getKnownError(
    messageOrRenderedFinding: RenderedRuleFinding | string,
    options?: ErrorOptions,
  ): Error {
    if (typeof messageOrRenderedFinding === 'string') {
      return new Error(
        this.KNOWN_ERROR_PREFIX + messageOrRenderedFinding,
        options,
      );
    }

    return new KnownFindingError(
      this.KNOWN_ERROR_PREFIX + messageOrRenderedFinding.message,
      messageOrRenderedFinding.finding,
      options,
    );
  }

  getResultCommentFromError(error: unknown): string {
    return this.getFailedResultFromError(error).resultComment;
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

  private processKnownError(error: unknown): FailedResultFromError | undefined {
    if (this.isKnownError(error)) {
      return {
        resultComment: this.getKnownErrorMessage(error),
        resultFindings:
          error instanceof KnownFindingError ? [error.finding] : [],
      };
    }

    logger.error(error, 'Unexpected error on "processKnownError" method');
    Sentry.captureException(error);

    return undefined;
  }
}
