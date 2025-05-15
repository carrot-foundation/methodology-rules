import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentEventAttributeName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { CREDITS } = DocumentType;
const { REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT, UNIT_PRICE } =
  DocumentEventAttributeName;

export const ERROR_MESSAGES = {
  CERTIFICATE_DOCUMENT_NOT_FOUND: (certificateType: unknown) =>
    `The "${String(certificateType)}" documents were not found.`,
  CREDITS_DOCUMENT_NOT_FOUND: `The "${CREDITS}" document was not found.`,
  INVALID_UNIT_PRICE: `The "${UNIT_PRICE}" attribute in the "${CREDITS}" document is invalid.`,
  REJECTED_BY_ERROR: 'Unable to calculate rewards distribution.',
  REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT_NOT_FOUND: (documentId: string) =>
    `The "${documentId}" document has no "${REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT}" attribute in the "${CREDITS}" document.`,
} as const;

export class RewardsDistributionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = ERROR_MESSAGES;
}
