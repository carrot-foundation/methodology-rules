import { DocumentCategory } from '@carrot-fndn/shared/methodologies/bold/types';

const { MASS_ID } = DocumentCategory;

export const RESULT_COMMENTS = {
  failed: {
    VALID_DUPLICATE_FOUND: (
      totalDuplicates: number,
      validDuplicatesCount: number,
    ) =>
      `${totalDuplicates} similar ${MASS_ID}s were found, of which ${validDuplicatesCount} are not cancelled.`,
  },
  passed: {
    NO_DUPLICATES_FOUND: `No other ${MASS_ID}s with the same attributes were found.`,
    ONLY_CANCELLED_DUPLICATES: (
      totalDuplicates: number,
      cancelledCount: number,
    ) =>
      `${totalDuplicates} similar ${MASS_ID}s were found, but all are cancelled (${cancelledCount}).`,
  },
  reviewRequired: {},
} as const;
