import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentCategory,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { CREDIT_ORDER, MASS_ID_AUDIT } = DocumentType;
const { MASS_ID } = DocumentCategory;

const ERROR_MESSAGES = {
  MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME: (
    methodologyName: string,
  ) =>
    `There is already a "${MASS_ID_AUDIT}" for "${methodologyName}" linked to this "${MASS_ID}".`,
  MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT: (
    certificateSubtype: string,
  ) =>
    `There is already a "${certificateSubtype}" linked to this "${MASS_ID}".`,
  MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT: `There is already a "${CREDIT_ORDER}" document linked to this "${MASS_ID}".`,
  REJECTED_BY_ERROR: 'Unable to validate certificate uniqueness',
} as const;

export class CertificateUniquenessCheckProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = ERROR_MESSAGES;
}
