import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  type AttachmentInfo,
  type BaseExtractedData,
  type DocumentExtractorConfig,
  type DocumentType,
  type ExtractionOutput,
  getDefaultLayouts,
} from '@carrot-fndn/shared/document-extractor';
import { isNil, isNonEmptyString, logger } from '@carrot-fndn/shared/helpers';
import { getAttachmentS3Key } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type MethodologyDocumentEventAttachment,
  type MethodologyDocumentEventAttribute,
  type MethodologyDocumentEventAttributeValue,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './document-manifest-data.constants';

export type {
  AttachmentInfo,
  CrossValidationResult,
} from '@carrot-fndn/shared/document-extractor';

export interface DocumentManifestEventSubject {
  attachment: MethodologyDocumentEventAttachment | undefined;
  documentNumber: EventAttributeValueType;
  documentType: EventAttributeValueType;
  eventAddressId: string | undefined;
  eventValue: number | undefined;
  exemptionJustification: EventAttributeValueType;
  hasWrongLabelAttachment: boolean;
  issueDateAttribute: MethodologyDocumentEventAttribute | undefined;
  recyclerCountryCode: string | undefined;
}

export type EventAttributeValueType =
  | MethodologyDocumentEventAttributeValue
  | string
  | undefined;

export interface ValidationResult {
  failMessages: string[];
  passMessage?: string;
  reviewRequired?: boolean;
}

export const DOCUMENT_TYPE_MAPPING: Record<string, DocumentType> = {
  CDF: 'recyclingManifest',
  MTR: 'transportManifest',
};

export const getAttachmentInfos = ({
  documentId,
  events,
}: {
  documentId: string;
  events: DocumentManifestEventSubject[];
}): AttachmentInfo[] => {
  const bucketName = process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

  if (!bucketName) {
    logger.warn(
      'DOCUMENT_ATTACHMENT_BUCKET_NAME environment variable is not set, skipping attachment extraction',
    );

    return [];
  }

  return events
    .map((event) => event.attachment?.attachmentId)
    .filter((attachmentId) => isNonEmptyString(attachmentId))
    .map((attachmentId) => ({
      attachmentId,
      s3Bucket: bucketName,
      s3Key: getAttachmentS3Key(documentId, attachmentId),
    }));
};

export const getExtractorConfig = (
  eventDocumentType: EventAttributeValueType,
): DocumentExtractorConfig | undefined => {
  if (isNil(eventDocumentType)) {
    return undefined;
  }

  const typeString = eventDocumentType.toString();
  // eslint-disable-next-line security/detect-object-injection
  const documentType = DOCUMENT_TYPE_MAPPING[typeString];

  if (!documentType) {
    return undefined;
  }

  return {
    documentType,
    layouts: getDefaultLayouts(documentType),
  };
};

export const validateExtractedDataAgainstEvent = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventSubject: DocumentManifestEventSubject,
): ValidationResult => {
  const failMessages: string[] = [];
  const extractedData = extractionResult.data as
    | CdfExtractedData
    | MtrExtractedData;

  if (extractionResult.data.extractionConfidence === 'low') {
    return { failMessages, reviewRequired: true };
  }

  const eventDocumentNumber = eventSubject.documentNumber?.toString();
  const extractedDocumentNumber =
    'documentNumber' in extractedData
      ? extractedData.documentNumber.parsed
      : undefined;

  if (
    eventDocumentNumber &&
    extractedDocumentNumber &&
    extractedData.documentNumber.confidence === 'high' &&
    eventDocumentNumber !== extractedDocumentNumber
  ) {
    failMessages.push(
      RESULT_COMMENTS.DOCUMENT_NUMBER_MISMATCH({
        eventDocumentNumber,
        extractedDocumentNumber,
      }),
    );
  }

  const eventIssueDate = eventSubject.issueDateAttribute?.value?.toString();
  const extractedIssueDate =
    'issueDate' in extractedData ? extractedData.issueDate.parsed : undefined;

  if (
    eventIssueDate &&
    extractedIssueDate &&
    extractedData.issueDate.confidence === 'high' &&
    eventIssueDate !== extractedIssueDate
  ) {
    failMessages.push(
      RESULT_COMMENTS.ISSUE_DATE_MISMATCH({
        eventIssueDate,
        extractedIssueDate,
      }),
    );
  }

  return { failMessages };
};
