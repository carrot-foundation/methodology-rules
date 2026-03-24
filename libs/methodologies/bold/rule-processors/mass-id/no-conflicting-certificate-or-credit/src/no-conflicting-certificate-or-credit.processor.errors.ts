import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

const ERROR_MESSAGES = {
  FAILED_BY_ERROR:
    'Unable to validate that no conflicting certificate or credit exists',
  MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME: (
    methodologyName: string,
  ) =>
    `There is already a "MassID Audit" for "${methodologyName}" linked to this "MassID".`,
  MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT: (
    certificateSubtype: string,
  ) => `There is already a "${certificateSubtype}" linked to this "MassID".`,
  MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT: `There is already a "Credit Order" document linked to this "MassID".`,
} as const;

export class NoConflictingCertificateOrCreditProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = ERROR_MESSAGES;
}
