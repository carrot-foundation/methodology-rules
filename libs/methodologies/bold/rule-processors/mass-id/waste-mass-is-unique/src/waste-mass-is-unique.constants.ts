import { DocumentCategory } from '@carrot-fndn/shared/methodologies/bold/types';

export const RESULT_COMMENTS = {
  failed: {
    VALID_DUPLICATE_FOUND: (
      totalDuplicates: number,
      validDuplicatesCount: number,
    ) =>
      `${totalDuplicates} similar ${DocumentCategory.MassID}s were found, of which ${validDuplicatesCount} are not cancelled.`,
  },
  passed: {
    NO_DUPLICATES_FOUND: `No other ${DocumentCategory.MassID}s with the same attributes were found.`,
    ONLY_CANCELLED_DUPLICATES: (
      totalDuplicates: number,
      cancelledCount: number,
    ) =>
      `${totalDuplicates} similar ${DocumentCategory.MassID}s were found, but all are cancelled (${cancelledCount}).`,
  },
  reviewRequired: {},
} as const;
