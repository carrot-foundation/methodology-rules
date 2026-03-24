import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class MassIDSortingProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the mass-id-sorting.',
    INVALID_DEDUCTED_WEIGHT: (deductedWeight: unknown) =>
      `The "Deducted Weight" must be provided and greater than 0. Received "${String(deductedWeight)}".`,
    INVALID_DEDUCTED_WEIGHT_FORMAT: `The "Deducted Weight" format must be KILOGRAM.`,
    INVALID_GROSS_WEIGHT: (grossWeight: unknown) =>
      `The "Gross Weight" must be provided and greater than 0. Received "${String(grossWeight)}".`,
    INVALID_GROSS_WEIGHT_FORMAT: `The "Gross Weight" format must be KILOGRAM.`,
    INVALID_VALUE_AFTER_SORTING: (valueAfterSorting: unknown) =>
      `The value after the "Sorting" must be greater than 0, but "${String(valueAfterSorting)}" was provided.`,
    INVALID_VALUE_BEFORE_SORTING: (valueBeforeSorting: unknown) =>
      `The value before the "Sorting" must be greater than 0, but "${String(valueBeforeSorting)}" was provided.`,
    INVALID_WEIGHT_COMPARISON: (deductedWeight: number, grossWeight: number) =>
      `The "Deducted Weight" (${deductedWeight}) must be less than "Gross Weight" (${grossWeight}).`,
    MASS_ID_DOCUMENT_NOT_FOUND: `The "MassID" document was not found.`,
    MISSING_EXTERNAL_EVENTS: `The "MassID" document has no events.`,
    MISSING_RECYCLER_ACCREDITATION_DOCUMENT: `The "Recycler" accreditation was not found.`,
    MISSING_SORTING_EVENT: `No "Sorting" event was found in the document.`,
    MISSING_SORTING_FACTOR: `The "Sorting Factor" was not found in the "Recycler" accreditation.`,
  } as const;
}
