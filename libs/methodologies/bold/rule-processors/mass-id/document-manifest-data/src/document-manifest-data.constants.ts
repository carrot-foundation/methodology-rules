import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';

export const RESULT_COMMENTS = {
  ADDRESS_MISMATCH: `The "Recycling Manifest" event address does not match the "Recycler" ACTOR event address.`,
  ATTACHMENT_AND_JUSTIFICATION_PROVIDED: (manifestType: string) =>
    `The "Exemption Justification" should not be provided when a "${manifestType}" attachment is present.`,
  INCORRECT_ATTACHMENT_LABEL: (manifestType: string) =>
    `Expected an attachment with the "${manifestType}" label, but none was found.`,
  INVALID_BR_DOCUMENT_TYPE: (documentType: string) =>
    `The "Document Type" must be "MTR" for recyclers in Brazil, but "${documentType}" was provided.`,
  INVALID_ISSUE_DATE_FORMAT: (dateFormat: string) =>
    `The "Issue Date" format must be "Date", but the declared format is "${dateFormat}".`,
  MISSING_ATTRIBUTES: (manifestType: string) =>
    `Either the "${manifestType}" attachment or an "Exemption Justification" must be provided.`,
  MISSING_DOCUMENT_NUMBER: `The "Document Number" was not provided.`,
  MISSING_DOCUMENT_TYPE: `The "Document Type" was not provided.`,
  MISSING_EVENT: (manifestType: string) =>
    `At least one "${manifestType}" event must be provided.`,
  MISSING_ISSUE_DATE: `The "Issue Date" was not provided.`,
  MISSING_RECYCLER_EVENT: `The "Recycler" ACTOR event was not provided.`,
  PROVIDE_EXEMPTION_JUSTIFICATION: (manifestType: string) =>
    `The "${manifestType}" attachment was not provided, but an "Exemption Justification" was declared.`,
  VALID_ATTACHMENT_DECLARATION: ({
    documentNumber,
    documentType,
    issueDate,
    value,
  }: {
    documentNumber: string;
    documentType: string;
    issueDate: string;
    value: number;
  }) =>
    `The ${documentType} attachment (No. ${documentNumber}), issued on ${issueDate}, with a value of ${value}kg, was provided.`,
} as const;

export const CROSS_VALIDATION_COMMENTS = {
  DOCUMENT_EXTRACTION_CONFIDENCE_LOW: ({
    confidence,
  }: {
    confidence: string;
  }) =>
    `Extraction confidence is low (${confidence}). Cross-validation skipped; manual review required.`,
  DOCUMENT_NUMBER_MISMATCH: ({
    eventDocumentNumber,
    extractedDocumentNumber,
  }: {
    eventDocumentNumber: string;
    extractedDocumentNumber: string;
  }) =>
    `The "Document Number" declared in the event ("${eventDocumentNumber}") does not match the extracted value from the document ("${extractedDocumentNumber}").`,
  DROP_OFF_DATE_OUTSIDE_PERIOD: ({
    dropOffDate,
    periodEnd,
    periodStart,
  }: {
    dropOffDate: string;
    periodEnd: string;
    periodStart: string;
  }) =>
    `The Drop-off event date ("${dropOffDate}") falls outside the recycling manifest processing period ("${periodStart}" to "${periodEnd}").`,
  FIELD_NOT_EXTRACTED: ({
    context,
    field,
  }: {
    context?: string;
    field: string;
  }) => {
    const suffix = context ? ` with the ${context}` : '';

    return `The ${field} could not be extracted from the document for cross-validation${suffix}.`;
  },
  GENERATOR_ADDRESS_MISMATCH: ({ score }: { score: number }) =>
    `The generator address extracted from the document does not match the "Waste Generator" ACTOR event address. Similarity: ${(score * 100).toFixed(0)}%.`,
  GENERATOR_TAX_ID_MISMATCH: `The generator tax ID extracted from the document does not match the "Waste Generator" participant tax ID.`,
  HAULER_TAX_ID_MISMATCH: `The hauler tax ID extracted from the document does not match the "Hauler" participant tax ID.`,
  ISSUE_DATE_MISMATCH: ({
    eventIssueDate,
    extractedIssueDate,
  }: {
    eventIssueDate: string;
    extractedIssueDate: string;
  }) =>
    `The "Issue Date" declared in the event ("${eventIssueDate}") does not match the extracted value from the document ("${extractedIssueDate}").`,
  MTR_NUMBER_NOT_IN_CDF: ({ mtrNumber }: { mtrNumber: string }) =>
    `The MTR number ("${mtrNumber}") from this mass-id was not found in the CDF's transport manifests list.`,
  RECEIVER_ADDRESS_MISMATCH: ({ score }: { score: number }) =>
    `The receiver address extracted from the document does not match the "Recycler" ACTOR event address. Similarity: ${(score * 100).toFixed(0)}%.`,
  RECEIVER_TAX_ID_MISMATCH: `The receiver tax ID extracted from the document does not match the "Recycler" participant tax ID.`,
  RECEIVING_DATE_MISMATCH: ({
    daysDiff,
    eventDate,
    extractedDate,
  }: {
    daysDiff: number;
    eventDate: string;
    extractedDate: string;
  }) =>
    `The receiving date extracted from the document ("${extractedDate}") differs from the Drop-off event date ("${eventDate}") by ${daysDiff} day(s).`,
  RECYCLER_TAX_ID_MISMATCH: `The recycler tax ID extracted from the recycling manifest does not match the "Recycler" participant tax ID.`,
  RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH: ({
    extractedQuantityKg,
    weighingWeight,
  }: {
    extractedQuantityKg: string;
    weighingWeight: string;
  }) =>
    `The waste quantity extracted from the recycling manifest (${extractedQuantityKg} kg) is less than the weighing event weight (${weighingWeight} kg).`,
  RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH: ({
    eventClassification,
    extractedEntries,
  }: {
    eventClassification: string;
    extractedEntries: string;
  }) =>
    `None of the waste types extracted from the recycling manifest (${extractedEntries}) match the event's waste classification (${eventClassification}).`,
  TRANSPORT_DATE_MISMATCH: ({
    daysDiff,
    eventDate,
    extractedDate,
  }: {
    daysDiff: number;
    eventDate: string;
    extractedDate: string;
  }) =>
    `The transport date extracted from the document ("${extractedDate}") differs from the Pick-up event date ("${eventDate}") by ${daysDiff} day(s).`,
  VEHICLE_PLATE_MISMATCH: `The vehicle plate extracted from the document does not match the Pick-up event value.`,
  WASTE_QUANTITY_WEIGHT_MISMATCH: ({
    extractedQuantityKg,
    weighingWeight,
  }: {
    extractedQuantityKg: string;
    weighingWeight: string;
  }) =>
    `The waste quantity extracted from the document (${extractedQuantityKg} kg) is less than the weighing event weight (${weighingWeight} kg).`,

  WASTE_TYPE_MISMATCH: ({
    eventClassification,
    extractedEntries,
  }: {
    eventClassification: string;
    extractedEntries: string;
  }) =>
    `None of the waste types extracted from the document (${extractedEntries}) match the Pick-up event's waste classification (${eventClassification}).`,
} as const;

function reviewReason<P extends object>(
  code: string,
  comment: (parameters: P) => string,
): (parameters: P) => ReviewReason {
  return (parameters: P): ReviewReason => ({
    code,
    description: comment(parameters),
  });
}

function staticReviewReason(
  code: string,
  description: string,
): () => ReviewReason {
  return (): ReviewReason => ({ code, description });
}

export const REVIEW_REASONS = {
  DOCUMENT_EXTRACTION_CONFIDENCE_LOW: reviewReason(
    'DOCUMENT_EXTRACTION_CONFIDENCE_LOW',
    CROSS_VALIDATION_COMMENTS.DOCUMENT_EXTRACTION_CONFIDENCE_LOW,
  ),
  DOCUMENT_NUMBER_MISMATCH: reviewReason(
    'DOCUMENT_NUMBER_MISMATCH',
    CROSS_VALIDATION_COMMENTS.DOCUMENT_NUMBER_MISMATCH,
  ),
  DROP_OFF_DATE_OUTSIDE_PERIOD: reviewReason(
    'DROP_OFF_DATE_OUTSIDE_PERIOD',
    CROSS_VALIDATION_COMMENTS.DROP_OFF_DATE_OUTSIDE_PERIOD,
  ),
  FIELD_NOT_EXTRACTED: reviewReason(
    'FIELD_NOT_EXTRACTED',
    CROSS_VALIDATION_COMMENTS.FIELD_NOT_EXTRACTED,
  ),
  GENERATOR_ADDRESS_MISMATCH: reviewReason(
    'GENERATOR_ADDRESS_MISMATCH',
    CROSS_VALIDATION_COMMENTS.GENERATOR_ADDRESS_MISMATCH,
  ),
  GENERATOR_TAX_ID_MISMATCH: staticReviewReason(
    'GENERATOR_TAX_ID_MISMATCH',
    CROSS_VALIDATION_COMMENTS.GENERATOR_TAX_ID_MISMATCH,
  ),
  HAULER_TAX_ID_MISMATCH: staticReviewReason(
    'HAULER_TAX_ID_MISMATCH',
    CROSS_VALIDATION_COMMENTS.HAULER_TAX_ID_MISMATCH,
  ),
  ISSUE_DATE_MISMATCH: reviewReason(
    'ISSUE_DATE_MISMATCH',
    CROSS_VALIDATION_COMMENTS.ISSUE_DATE_MISMATCH,
  ),
  MTR_NUMBER_NOT_IN_CDF: reviewReason(
    'MTR_NUMBER_NOT_IN_CDF',
    CROSS_VALIDATION_COMMENTS.MTR_NUMBER_NOT_IN_CDF,
  ),
  RECEIVER_ADDRESS_MISMATCH: reviewReason(
    'RECEIVER_ADDRESS_MISMATCH',
    CROSS_VALIDATION_COMMENTS.RECEIVER_ADDRESS_MISMATCH,
  ),
  RECEIVER_TAX_ID_MISMATCH: staticReviewReason(
    'RECEIVER_TAX_ID_MISMATCH',
    CROSS_VALIDATION_COMMENTS.RECEIVER_TAX_ID_MISMATCH,
  ),
  RECEIVING_DATE_MISMATCH: reviewReason(
    'RECEIVING_DATE_MISMATCH',
    CROSS_VALIDATION_COMMENTS.RECEIVING_DATE_MISMATCH,
  ),
  RECYCLER_TAX_ID_MISMATCH: staticReviewReason(
    'RECYCLER_TAX_ID_MISMATCH',
    CROSS_VALIDATION_COMMENTS.RECYCLER_TAX_ID_MISMATCH,
  ),
  RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH: reviewReason(
    'RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH',
    CROSS_VALIDATION_COMMENTS.RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH,
  ),
  RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH: reviewReason(
    'RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH',
    CROSS_VALIDATION_COMMENTS.RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH,
  ),
  TRANSPORT_DATE_MISMATCH: reviewReason(
    'TRANSPORT_DATE_MISMATCH',
    CROSS_VALIDATION_COMMENTS.TRANSPORT_DATE_MISMATCH,
  ),
  VEHICLE_PLATE_MISMATCH: staticReviewReason(
    'VEHICLE_PLATE_MISMATCH',
    CROSS_VALIDATION_COMMENTS.VEHICLE_PLATE_MISMATCH,
  ),
  WASTE_QUANTITY_WEIGHT_MISMATCH: reviewReason(
    'WASTE_QUANTITY_WEIGHT_MISMATCH',
    CROSS_VALIDATION_COMMENTS.WASTE_QUANTITY_WEIGHT_MISMATCH,
  ),
  WASTE_TYPE_MISMATCH: reviewReason(
    'WASTE_TYPE_MISMATCH',
    CROSS_VALIDATION_COMMENTS.WASTE_TYPE_MISMATCH,
  ),
};
