import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentEventAttributeName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { CREDIT_ORDER } = DocumentType;
const { RULE_RESULT_DETAILS, UNIT_PRICE } = DocumentEventAttributeName;

export const ERROR_MESSAGES = {
  CERTIFICATE_DOCUMENT_NOT_FOUND: (certificateType: unknown) =>
    `The "${String(certificateType)}" documents were not found.`,
  CREDIT_ORDER_DOCUMENT_NOT_FOUND: `The "${CREDIT_ORDER}" document was not found.`,
  INVALID_UNIT_PRICE: `The "${UNIT_PRICE}" attribute in the "${CREDIT_ORDER}" document is invalid.`,
  REJECTED_BY_ERROR: 'Unable to calculate rewards distribution.',
  REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT_NOT_FOUND: (documentId: string) =>
    `The "${documentId}" document has no "${RULE_RESULT_DETAILS}" attribute.`,
} as const;

export class RewardsDistributionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = ERROR_MESSAGES;
}
