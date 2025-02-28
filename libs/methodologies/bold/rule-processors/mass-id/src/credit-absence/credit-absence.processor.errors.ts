import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class CreditAbsenceProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT: (creditSubtype: string) =>
      `There is already a ${creditSubtype} linked to this MassID`,
    REJECTED_BY_ERROR: 'Unable to validate Credit Absence',
  } as const;
}
