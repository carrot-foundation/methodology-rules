import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  type BaseExtractedData,
  type ExtractedEntityInfo,
  type ExtractedField,
  type ExtractionConfidence,
  type ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import { dateDifferenceInDays, isNameMatch } from '@carrot-fndn/shared/helpers';

import type {
  DocumentManifestEventSubject,
  ValidationResult,
} from './document-manifest-data.helpers';

import { CROSS_VALIDATION_COMMENTS } from './document-manifest-data.constants';

export interface FieldValidationResult {
  failMessage?: string;
  reviewReason?: string;
}

export const routeByConfidence = (
  confidence: ExtractionConfidence,
  message: string,
): FieldValidationResult =>
  confidence === 'high' ? { failMessage: message } : { reviewReason: message };

export const collectResults = (
  results: FieldValidationResult[],
): { failMessages: string[]; reviewReasons: string[] } => {
  const failMessages: string[] = [];
  const reviewReasons: string[] = [];

  for (const { failMessage, reviewReason } of results) {
    if (failMessage) {
      failMessages.push(failMessage);
    }

    if (reviewReason) {
      reviewReasons.push(reviewReason);
    }
  }

  return { failMessages, reviewReasons };
};

export const validateHighConfidenceField = (
  eventValue: string | undefined,
  extractedField: ExtractedField<string> | undefined,
  mismatchComment: (parameters: {
    eventValue: string;
    extractedValue: string;
  }) => string,
): string | undefined => {
  if (
    !eventValue ||
    !extractedField ||
    extractedField.confidence !== 'high' ||
    eventValue === extractedField.parsed
  ) {
    return undefined;
  }

  return mismatchComment({
    eventValue,
    extractedValue: extractedField.parsed,
  });
};

export const validateBasicExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventSubject: DocumentManifestEventSubject,
): ValidationResult => {
  const extractedData = extractionResult.data as
    | CdfExtractedData
    | MtrExtractedData;

  if (extractionResult.data.extractionConfidence === 'low') {
    return { failMessages: [], reviewRequired: true };
  }

  const failMessages: string[] = [];

  const documentNumberMismatch = validateHighConfidenceField(
    eventSubject.documentNumber?.toString(),
    'documentNumber' in extractedData
      ? extractedData.documentNumber
      : undefined,
    ({ eventValue, extractedValue }) =>
      CROSS_VALIDATION_COMMENTS.DOCUMENT_NUMBER_MISMATCH({
        eventDocumentNumber: eventValue,
        extractedDocumentNumber: extractedValue,
      }),
  );

  if (documentNumberMismatch) {
    failMessages.push(documentNumberMismatch);
  }

  const eventIssueDate = eventSubject.issueDateAttribute?.value?.toString();
  const extractedIssueDate =
    'issueDate' in extractedData ? extractedData.issueDate : undefined;

  if (
    eventIssueDate &&
    extractedIssueDate &&
    extractedIssueDate.confidence === 'high'
  ) {
    const daysDiff = dateDifferenceInDays(
      eventIssueDate,
      extractedIssueDate.parsed,
    );

    if (daysDiff !== undefined && daysDiff > 0) {
      failMessages.push(
        CROSS_VALIDATION_COMMENTS.ISSUE_DATE_MISMATCH({
          eventIssueDate,
          extractedIssueDate: extractedIssueDate.parsed,
        }),
      );
    }
  }

  return { failMessages };
};

export const normalizeTaxId = (taxId: string): string =>
  taxId.replaceAll(/[\s./-]/g, '').toLowerCase();

export const validateEntityName = (
  extractedEntity: ExtractedEntityInfo | undefined,
  eventParticipantName: string | undefined,
  commentFunction: (parameters: {
    eventName: string;
    extractedName: string;
    score: number;
  }) => string,
): FieldValidationResult => {
  if (!extractedEntity || !eventParticipantName) {
    return {};
  }

  if (extractedEntity.name.confidence !== 'high') {
    return {};
  }

  const extractedName = extractedEntity.name.parsed;
  const { isMatch, score } = isNameMatch(extractedName, eventParticipantName);

  return isMatch
    ? {}
    : {
        reviewReason: commentFunction({
          eventName: eventParticipantName,
          extractedName,
          score,
        }),
      };
};

export const validateEntityTaxId = (
  extractedEntity: ExtractedEntityInfo | undefined,
  eventParticipantTaxId: string | undefined,
  mismatchComment: string,
): FieldValidationResult => {
  if (!extractedEntity || !eventParticipantTaxId) {
    return {};
  }

  if (extractedEntity.taxId.confidence !== 'high') {
    return {};
  }

  const extractedTaxId = extractedEntity.taxId.parsed;

  if (
    normalizeTaxId(extractedTaxId) === normalizeTaxId(eventParticipantTaxId)
  ) {
    return {};
  }

  return routeByConfidence(extractedEntity.taxId.confidence, mismatchComment);
};
