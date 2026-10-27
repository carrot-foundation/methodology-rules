export const DOCUMENT_EXTRACTION_COMMENTS = {
  EXTRACTION_FAILED: (attachmentId: string, errorMessage: string) =>
    `Document extraction failed for attachment ${attachmentId}: ${errorMessage}`,
  LAYOUT_NOT_RECOGNIZED: (attachmentId: string, errorMessage: string) =>
    `Attachment ${attachmentId} does not match any supported layout: ${errorMessage}`,
  LOW_CONFIDENCE_FIELD: (field: string) => `Low confidence field: ${field}`,
  LOW_LAYOUT_MATCH_SCORE: (layoutMatchScore: number, reviewThreshold: number) =>
    `Layout match score (${layoutMatchScore.toFixed(2)}) below review threshold (${reviewThreshold})`,
  UNKNOWN_DOCUMENT_TYPE: (attachmentId: string) =>
    `Unknown document type, cannot perform cross-validation for attachment ${attachmentId}`,
} as const;

export type DocumentExtractionCommentKey =
  keyof typeof DOCUMENT_EXTRACTION_COMMENTS;

export const LOW_CONFIDENCE_REASON_CODE_PREFIX = 'LOW_CONFIDENCE_';
