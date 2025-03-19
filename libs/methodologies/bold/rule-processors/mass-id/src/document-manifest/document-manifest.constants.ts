import {
  DocumentEventName,
  NewDocumentEventAttributeName,
  NewMeasurementUnit,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

const { DOCUMENT_NUMBER, DOCUMENT_TYPE, EXEMPTION_JUSTIFICATION, ISSUE_DATE } =
  NewDocumentEventAttributeName;
const { RECYCLING_MANIFEST, TRANSPORT_MANIFEST } = DocumentEventName;
const { DATE } = MethodologyDocumentEventAttributeFormat;
const { RECYCLER } = MethodologyDocumentEventLabel;
const { MTR } = ReportType;

export const RESULT_COMMENTS = {
  ADDRESS_MISMATCH: `The "${RECYCLING_MANIFEST}" event address does not match the "${RECYCLER}" event address.`,
  ATTACHMENT_AND_JUSTIFICATION_PROVIDED: `The "${EXEMPTION_JUSTIFICATION}" should not be provided when a "${TRANSPORT_MANIFEST}" attachment is present.`,
  INCORRECT_ATTACHMENT_LABEL: (label: string) =>
    `Expected "${TRANSPORT_MANIFEST}" attachment label, but "${label}" was provided.`,
  INVALID_BR_DOCUMENT_TYPE: (documentType: string) =>
    `The "${DOCUMENT_TYPE}" must be "${MTR}" for recyclers in Brazil, but "${documentType}" was provided.`,
  INVALID_EVENT_VALUE: (event: string) =>
    `The event value must be defined and greater than 0, but "${event}" was provided.`,
  INVALID_ISSUE_DATE_FORMAT: (dateFormat: string) =>
    `The "${ISSUE_DATE}" format must be "${DATE}", but the declared format is "${dateFormat}".`,
  MISSING_ATTRIBUTES: `Either the "${TRANSPORT_MANIFEST}" attachment or an "${EXEMPTION_JUSTIFICATION}" must be provided.`,
  MISSING_DOCUMENT_NUMBER: `The "${DOCUMENT_NUMBER}" was not provided.`,
  MISSING_DOCUMENT_TYPE: `The "${DOCUMENT_TYPE}" was not provided.`,
  MISSING_EVENT: `At least one "${TRANSPORT_MANIFEST}" event must be provided.`,
  MISSING_ISSUE_DATE: `The "${ISSUE_DATE}" was not provided.`,
  MISSING_RECYCLER_EVENT: `The "${RECYCLER}" event was not provided.`,
  PROVIDE_EXEMPTION_JUSTIFICATION: `The "${TRANSPORT_MANIFEST}" attachment was not provided, but an "${EXEMPTION_JUSTIFICATION}" was declared.`,
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
    `The ${documentType} attachment (No. ${documentNumber}), issued on ${issueDate}, with a value of ${value}${NewMeasurementUnit.KG}, was provided.`,
} as const;
