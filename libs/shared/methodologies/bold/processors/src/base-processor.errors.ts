import type {
  RenderedRuleFinding,
  RuleFindingsResult,
} from '@carrot-fndn/shared/rule/result';
import type { RuleFinding } from '@carrot-fndn/shared/rule/types';

import { logger } from '@carrot-fndn/shared/helpers';
import * as Sentry from '@sentry/aws-serverless';

export interface ErrorMessage {
  [key: string]: ((...arguments_: never[]) => string) | string;
  FAILED_BY_ERROR: string;
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

  getFailedResultFromError(error: unknown): RuleFindingsResult {
    const failedResult = this.processKnownError(error);

    if (failedResult === undefined) {
      throw error;
    }

    return failedResult;
  }

  getKnownError(
    renderedFinding: RenderedRuleFinding,
    options?: ErrorOptions,
  ): Error {
    return new KnownFindingError(
      renderedFinding.message,
      renderedFinding.finding,
      options,
    );
  }

  private isKnownError(error: unknown): error is KnownFindingError {
    return error instanceof KnownFindingError;
  }

  private processKnownError(error: unknown): RuleFindingsResult | undefined {
    if (this.isKnownError(error)) {
      return {
        resultComment: error.message,
        resultFindings: [error.finding],
      };
    }

    logger.error(error, 'Unexpected error on "processKnownError" method');
    Sentry.captureException(error);

    return undefined;
  }
}
