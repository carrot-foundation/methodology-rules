import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

const { RECYCLER } = MethodologyDocumentEventLabel;
const { MASS_ID } = DocumentCategory;
const { SORTING } = DocumentEventName;
const { DEDUCTED_WEIGHT, GROSS_WEIGHT, SORTING_FACTOR } =
  DocumentEventAttributeName;
const { KILOGRAM } = MethodologyDocumentEventAttributeFormat;

export class MassIdSortingProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the mass-id-sorting.',
    INVALID_DEDUCTED_WEIGHT: (deductedWeight: unknown) =>
      `The "${DEDUCTED_WEIGHT}" must be provided and greater than 0. Received "${String(deductedWeight)}".`,
    INVALID_DEDUCTED_WEIGHT_FORMAT: `The "${DEDUCTED_WEIGHT}" format must be ${KILOGRAM}.`,
    INVALID_GROSS_WEIGHT: (grossWeight: unknown) =>
      `The "${GROSS_WEIGHT}" must be provided and greater than 0. Received "${String(grossWeight)}".`,
    INVALID_GROSS_WEIGHT_FORMAT: `The "${GROSS_WEIGHT}" format must be ${KILOGRAM}.`,
    INVALID_VALUE_AFTER_SORTING: (valueAfterSorting: unknown) =>
      `The value after the "${SORTING}" must be greater than 0, but "${String(valueAfterSorting)}" was provided.`,
    INVALID_VALUE_BEFORE_SORTING: (valueBeforeSorting: unknown) =>
      `The value before the "${SORTING}" must be greater than 0, but "${String(valueBeforeSorting)}" was provided.`,
    INVALID_WEIGHT_COMPARISON: (deductedWeight: number, grossWeight: number) =>
      `The "${DEDUCTED_WEIGHT}" (${deductedWeight}) must be less than "${GROSS_WEIGHT}" (${grossWeight}).`,
    MASS_ID_DOCUMENT_NOT_FOUND: `The "${MASS_ID}" document was not found.`,
    MISSING_EXTERNAL_EVENTS: `The "${MASS_ID}" document has no events.`,
    MISSING_RECYCLER_ACCREDITATION_DOCUMENT: `The "${RECYCLER}" accreditation was not found.`,
    MISSING_SORTING_EVENT: `No "${SORTING}" event was found in the document.`,
    MISSING_SORTING_FACTOR: `The "${SORTING_FACTOR}" was not found in the "${RECYCLER}" accreditation.`,
  } as const;
}
