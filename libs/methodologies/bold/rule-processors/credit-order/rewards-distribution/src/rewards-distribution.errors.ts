import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export const ERROR_MESSAGES = {
  CERTIFICATE_DOCUMENT_NOT_FOUND: (certificateType: unknown) =>
    `The "${String(certificateType)}" documents were not found.`,
  CREDIT_ORDER_DOCUMENT_NOT_FOUND: `The "Credit Order" document was not found.`,
  FAILED_BY_ERROR: 'Unable to calculate rewards distribution.',
  INVALID_CREDIT_UNIT_PRICE: `The "Credit Unit Price" attribute in the "Credit Order" document is invalid.`,
  REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT_NOT_FOUND: (documentId: string) =>
    `The "${documentId}" document has no "Rule Result Details" attribute.`,
} as const;

export class RewardsDistributionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = ERROR_MESSAGES;
}
