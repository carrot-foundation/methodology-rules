import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import { DocumentCategory } from '@carrot-fndn/shared/methodologies/bold/types';

const { MASS_ID, METHODOLOGY } = DocumentCategory;

export const ERROR_MESSAGES = {
  EXTERNAL_EVENTS_NOT_FOUND: (documentId: string) =>
    `Document ${documentId} does not contain events.`,
  FAILED_BY_ERROR: 'Unable to calculate rewards distribution.',
  MASS_ID_DOCUMENT_NOT_FOUND: `The "${MASS_ID}" document was not found.`,
  METHODOLOGY_DOCUMENT_NOT_FOUND: `The "${METHODOLOGY}" document was not found.`,
  MISSING_REQUIRED_ACTORS: (documentId: string, actorTypes: string[]) =>
    `Missing required actor types "${actorTypes.join(', ')}" in the document ${documentId}.`,
  UNEXPECTED_DOCUMENT_SUBTYPE: (subtype: string) =>
    `The "${MASS_ID}" document has an unexpected subtype: ${subtype}.`,
} as const;

export class RewardsDistributionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = ERROR_MESSAGES;
}
