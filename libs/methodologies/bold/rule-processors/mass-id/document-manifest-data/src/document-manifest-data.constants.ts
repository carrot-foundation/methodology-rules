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
  GENERATOR_NAME_MISMATCH: ({
    score,
  }: {
    eventName: string;
    extractedName: string;
    score: number;
  }) =>
    `The generator name extracted from the document does not match the "${WASTE_GENERATOR}" participant name. Similarity: ${(score * 100).toFixed(0)}%.`,
  GENERATOR_TAX_ID_MISMATCH: `The generator tax ID extracted from the document does not match the "${WASTE_GENERATOR}" participant tax ID.`,
  HAULER_NAME_MISMATCH: ({
    score,
  }: {
    eventName: string;
    extractedName: string;
    score: number;
  }) =>
    `The hauler name extracted from the document does not match the "${HAULER}" participant name. Similarity: ${(score * 100).toFixed(0)}%.`,
  HAULER_TAX_ID_MISMATCH: `The hauler tax ID extracted from the document does not match the "${HAULER}" participant tax ID.`,
  ISSUE_DATE_MISMATCH: ({
    eventIssueDate,
    extractedIssueDate,
  }: {
    eventIssueDate: string;
    extractedIssueDate: string;
  }) =>
    `The "${ISSUE_DATE}" declared in the event ("${eventIssueDate}") does not match the extracted value from the document ("${extractedIssueDate}").`,
  RECEIVER_NAME_MISMATCH: ({
    score,
  }: {
    eventName: string;
    extractedName: string;
    score: number;
  }) =>
    `The receiver name extracted from the document does not match the "${RECYCLER}" participant name. Similarity: ${(score * 100).toFixed(0)}%.`,
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
  VEHICLE_PLATE_MISMATCH: ({
    eventPlate,
    extractedPlate,
  }: {
    eventPlate: string;
    extractedPlate: string;
  }) =>
    `The vehicle plate extracted from the document ("${extractedPlate}") does not match the Pick-up event value ("${eventPlate}").`,
  WASTE_TYPE_MISMATCH: ({
    eventClassification,
    extractedEntries,
  }: {
    eventClassification: string;
    extractedEntries: string;
  }) =>
    `None of the waste types extracted from the document (${extractedEntries}) match the Pick-up event's waste classification (${eventClassification}).`,
} as const;
