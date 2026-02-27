import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';

import {
  DocumentEventAttributeName,
  DocumentEventName,
  MeasurementUnit,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

const { DOCUMENT_NUMBER, DOCUMENT_TYPE, EXEMPTION_JUSTIFICATION, ISSUE_DATE } =
  DocumentEventAttributeName;
const { RECYCLING_MANIFEST } = DocumentEventName;
const { DATE } = MethodologyDocumentEventAttributeFormat;
const { HAULER, RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { MTR } = ReportType;

export const RESULT_COMMENTS = {
  ADDRESS_MISMATCH: `The "${RECYCLING_MANIFEST}" event address does not match the "${RECYCLER}" event address.`,
  ATTACHMENT_AND_JUSTIFICATION_PROVIDED: (manifestType: string) =>
    `The "${EXEMPTION_JUSTIFICATION}" should not be provided when a "${manifestType}" attachment is present.`,
  INCORRECT_ATTACHMENT_LABEL: (manifestType: string) =>
    `Expected an attachment with the "${manifestType}" label, but no one was found.`,
  INVALID_BR_DOCUMENT_TYPE: (documentType: string) =>
    `The "${DOCUMENT_TYPE}" must be "${MTR}" for recyclers in Brazil, but "${documentType}" was provided.`,
  INVALID_ISSUE_DATE_FORMAT: (dateFormat: string) =>
    `The "${ISSUE_DATE}" format must be "${DATE}", but the declared format is "${dateFormat}".`,
  MISSING_ATTRIBUTES: (manifestType: string) =>
    `Either the "${manifestType}" attachment or an "${EXEMPTION_JUSTIFICATION}" must be provided.`,
  MISSING_DOCUMENT_NUMBER: `The "${DOCUMENT_NUMBER}" was not provided.`,
  MISSING_DOCUMENT_TYPE: `The "${DOCUMENT_TYPE}" was not provided.`,
  MISSING_EVENT: (manifestType: string) =>
    `At least one "${manifestType}" event must be provided.`,
  MISSING_ISSUE_DATE: `The "${ISSUE_DATE}" was not provided.`,
  MISSING_RECYCLER_EVENT: `The "${RECYCLER}" event was not provided.`,
  PROVIDE_EXEMPTION_JUSTIFICATION: (manifestType: string) =>
    `The "${manifestType}" attachment was not provided, but an "${EXEMPTION_JUSTIFICATION}" was declared.`,
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
    `The ${documentType} attachment (No. ${documentNumber}), issued on ${issueDate}, with a value of ${value}${MeasurementUnit.KG}, was provided.`,
} as const;

export const CROSS_VALIDATION_COMMENTS = {
  DOCUMENT_NUMBER_MISMATCH: ({
    eventDocumentNumber,
    extractedDocumentNumber,
  }: {
    eventDocumentNumber: string;
    extractedDocumentNumber: string;
  }) =>
    `The "${DOCUMENT_NUMBER}" declared in the event ("${eventDocumentNumber}") does not match the extracted value from the document ("${extractedDocumentNumber}").`,
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
    `The generator address extracted from the document does not match the "${WASTE_GENERATOR}" event address. Similarity: ${(score * 100).toFixed(0)}%.`,
  GENERATOR_TAX_ID_MISMATCH: `The generator tax ID extracted from the document does not match the "${WASTE_GENERATOR}" participant tax ID.`,
  HAULER_TAX_ID_MISMATCH: `The hauler tax ID extracted from the document does not match the "${HAULER}" participant tax ID.`,
  ISSUE_DATE_MISMATCH: ({
    eventIssueDate,
    extractedIssueDate,
  }: {
    eventIssueDate: string;
    extractedIssueDate: string;
  }) =>
    `The "${ISSUE_DATE}" declared in the event ("${eventIssueDate}") does not match the extracted value from the document ("${extractedIssueDate}").`,
  MTR_NUMBER_NOT_IN_CDF: ({ mtrNumber }: { mtrNumber: string }) =>
    `The MTR number ("${mtrNumber}") from this mass-id was not found in the CDF's transport manifests list.`,
  RECEIVER_ADDRESS_MISMATCH: ({ score }: { score: number }) =>
    `The receiver address extracted from the document does not match the "${RECYCLER}" event address. Similarity: ${(score * 100).toFixed(0)}%.`,
  RECEIVER_TAX_ID_MISMATCH: `The receiver tax ID extracted from the document does not match the "${RECYCLER}" participant tax ID.`,
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
  RECYCLER_TAX_ID_MISMATCH: `The recycler tax ID extracted from the recycling manifest does not match the "${RECYCLER}" participant tax ID.`,
  RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH: ({
    extractedQuantityKg,
    weighingWeight,
  }: {
    extractedQuantityKg: string;
    weighingWeight: string;
  }) =>
    `The waste quantity extracted from the recycling manifest (${extractedQuantityKg} ${MeasurementUnit.KG}) is less than the weighing event weight (${weighingWeight} ${MeasurementUnit.KG}).`,
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
    `The waste quantity extracted from the document (${extractedQuantityKg} ${MeasurementUnit.KG}) is less than the weighing event weight (${weighingWeight} ${MeasurementUnit.KG}).`,

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
