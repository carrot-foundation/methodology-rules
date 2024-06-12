import { logger } from '@carrot-fndn/shared/helpers';

export class RewardsDistributionProcessorErrors {
  private readonly KNOWN_ERROR_PREFIX = String(Symbol('[KNOWN ERROR]: '));

  readonly ERROR_MESSAGE = {
    DOCUMENT_DOES_NOT_CONTAIN_EVENTS: (documentId: string) =>
      `Document ${documentId} does not contain events`,
    MASS_DOCUMENTS_NOT_FOUND: 'Mass documents not found',
    METHODOLOGY_DOCUMENT_NOT_FOUND: 'Methodology document not found',
    MISSING_REQUIRED_ACTORS: (documentId: string, actorTypes: string[]) =>
      `Missing required actor types "${actorTypes.join(', ')}" in the document ${documentId}`,
    REJECTED_BY_ERROR: 'Unable to calculate rewards distribution',
    UNEXPECTED_DOCUMENT_SUBTYPE: 'Unexpected document subtype',
  } as const;

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

    return undefined;
  }

  getKnownError(message: string): Error {
    return new Error(this.KNOWN_ERROR_PREFIX + message);
  }

  getResultCommentFromError(error: unknown): string {
    return (
      this.processKnownError(error) || this.ERROR_MESSAGE.REJECTED_BY_ERROR
    );
  }
}
