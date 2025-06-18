import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { RECYCLER } = MethodologyDocumentEventLabel;
const { MASS_ID } = DocumentCategory;
const { SORTING } = DocumentEventName;
const { SORTING_FACTOR } = DocumentEventAttributeName;

export class MassIdSortingProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the mass-id-sorting.',
    INVALID_VALUE_AFTER_SORTING: (valueAfterSorting: unknown) =>
      `The value after the "${SORTING}" must be greater than 0, but "${String(valueAfterSorting)}" was provided.`,
    INVALID_VALUE_BEFORE_SORTING: (valueBeforeSorting: unknown) =>
      `The value before the "${SORTING}" must be greater than 0, but "${String(valueBeforeSorting)}" was provided.`,
    MASS_ID_DOCUMENT_NOT_FOUND: `The "${MASS_ID}" document was not found.`,
    MISSING_EXTERNAL_EVENTS: `The "${MASS_ID}" document has no events.`,
    MISSING_RECYCLER_HOMOLOGATION_DOCUMENT: `The "${RECYCLER}" homologation was not found.`,
    MISSING_SORTING_EVENT: `No "${SORTING}" event was found in the document.`,
    MISSING_SORTING_FACTOR: `The "${SORTING_FACTOR}" was not found in the "${RECYCLER}" homologation.`,
  } as const;
}
