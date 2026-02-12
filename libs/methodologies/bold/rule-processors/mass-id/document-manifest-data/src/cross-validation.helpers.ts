import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type {
  MtrExtractedData,
  WasteTypeEntryData,
} from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { MethodologyAddress } from '@carrot-fndn/shared/types';

import {
  type BaseExtractedData,
  type ExtractedEntityInfo,
  type ExtractedEntityWithAddressInfo,
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
  commentFunction: (parameters: { score: number }) => string,
  notExtractedComment?: string,
): FieldValidationResult => {
  if (!extractedEntity) {
    return eventParticipantName !== undefined &&
      notExtractedComment !== undefined
      ? { reviewReason: notExtractedComment }
      : {};
  }

  if (!eventParticipantName) {
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
        reviewReason: commentFunction({ score }),
      };
};

export const validateEntityTaxId = (
  extractedEntity: ExtractedEntityInfo | undefined,
  eventParticipantTaxId: string | undefined,
  mismatchComment: string,
  notExtractedComment?: string,
): FieldValidationResult => {
  if (!extractedEntity) {
    return eventParticipantTaxId !== undefined &&
      notExtractedComment !== undefined
      ? { reviewReason: notExtractedComment }
      : {};
  }

  if (!eventParticipantTaxId) {
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

export const validateEntityAddress = (
  extractedEntity: ExtractedEntityWithAddressInfo | undefined,
  eventAddress: MethodologyAddress | undefined,
  commentFunction: (parameters: { score: number }) => string,
  notExtractedComment?: string,
): FieldValidationResult => {
  if (!extractedEntity) {
    return eventAddress !== undefined && notExtractedComment !== undefined
      ? { reviewReason: notExtractedComment }
      : {};
  }

  if (!eventAddress) {
    return {};
  }

  if (extractedEntity.address.confidence !== 'high') {
    return {};
  }

  const extractedAddress = [
    extractedEntity.address.parsed,
    extractedEntity.city.parsed,
    extractedEntity.state.parsed,
  ]
    .filter(Boolean)
    .join(', ');

  const eventAddressString = [
    eventAddress.street,
    eventAddress.number,
    eventAddress.city,
    eventAddress.countryState,
  ]
    .filter(Boolean)
    .join(', ');

  const { isMatch, score } = isNameMatch(extractedAddress, eventAddressString);

  return isMatch
    ? {}
    : {
        reviewReason: commentFunction({ score }),
      };
};

export const DATE_TOLERANCE_DAYS = 3;

export const validateDateField = (
  extractedDate: ExtractedField<string> | undefined,
  eventDateString: string | undefined,
  commentFunction: (parameters: {
    daysDiff: number;
    eventDate: string;
    extractedDate: string;
  }) => string,
  notExtractedComment?: string,
): FieldValidationResult => {
  if (!extractedDate) {
    return eventDateString !== undefined && notExtractedComment !== undefined
      ? { reviewReason: notExtractedComment }
      : {};
  }

  if (!eventDateString) {
    return {};
  }

  if (extractedDate.confidence !== 'high') {
    return {};
  }

  const daysDiff = dateDifferenceInDays(extractedDate.parsed, eventDateString);

  if (daysDiff === undefined || daysDiff === 0) {
    return {};
  }

  const message = commentFunction({
    daysDiff,
    eventDate: eventDateString,
    extractedDate: extractedDate.parsed,
  });

  return daysDiff > DATE_TOLERANCE_DAYS
    ? { failMessage: message }
    : { reviewReason: message };
};

export const WEIGHT_DISCREPANCY_THRESHOLD = 0.1;

export const normalizeQuantityToKg = (
  quantity: number,
  unit: string | undefined,
): number | undefined => {
  if (unit === undefined) {
    return quantity;
  }

  const normalized = unit.toLowerCase();

  if (normalized === 'kg') {
    return quantity;
  }

  if (normalized === 'ton' || normalized === 't') {
    return quantity * 1000;
  }

  return undefined;
};

const normalizeWasteCode = (code: string): string =>
  code.replaceAll(/\s+/g, '').toLowerCase();

export interface WasteTypeMatchResult {
  descriptionSimilarity: null | number;
  isCodeMatch: boolean | null;
  isMatch: boolean;
}

export const matchWasteTypeEntry = (
  entry: WasteTypeEntryData,
  eventCode: string | undefined,
  eventDescription: string | undefined,
): WasteTypeMatchResult => {
  if (entry.code && eventCode && eventCode.length > 0) {
    const isCodeMatch =
      normalizeWasteCode(eventCode) === normalizeWasteCode(entry.code);

    if (!isCodeMatch || eventDescription === undefined) {
      return { descriptionSimilarity: null, isCodeMatch, isMatch: false };
    }

    const { isMatch, score } = isNameMatch(entry.description, eventDescription);

    return { descriptionSimilarity: score, isCodeMatch, isMatch };
  }

  if (eventDescription) {
    const { isMatch, score } = isNameMatch(entry.description, eventDescription);

    return { descriptionSimilarity: score, isCodeMatch: null, isMatch };
  }

  return { descriptionSimilarity: null, isCodeMatch: null, isMatch: false };
};

export const parsePeriodRange = (
  period: string,
): undefined | { end: string; start: string } => {
  const match =
    /(\d{2}\/\d{2}\/\d{4})\s+(?:ate|a)\s+(\d{2}\/\d{2}\/\d{4})/i.exec(period);

  if (!match?.[1] || !match[2]) {
    return undefined;
  }

  return { end: match[2], start: match[1] };
};

const ddmmyyyyToIso = (dateString: string): string | undefined => {
  const parts = dateString.split('/');

  // istanbul ignore next -- parsePeriodRange regex guarantees DD/MM/YYYY format
  if (parts.length !== 3) {
    return undefined;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export const validateDateWithinPeriod = (
  eventDateString: string | undefined,
  periodField: ExtractedField<string> | undefined,
  commentFunction: (parameters: {
    dropOffDate: string;
    periodEnd: string;
    periodStart: string;
  }) => string,
  notExtractedComment?: string,
): FieldValidationResult => {
  if (!periodField) {
    return eventDateString !== undefined && notExtractedComment !== undefined
      ? { reviewReason: notExtractedComment }
      : {};
  }

  if (!eventDateString) {
    return {};
  }

  const range = parsePeriodRange(periodField.parsed);

  if (!range) {
    return {};
  }

  const startIso = ddmmyyyyToIso(range.start);
  const endIso = ddmmyyyyToIso(range.end);
  const eventIso = eventDateString.slice(0, 10);

  // istanbul ignore next -- parsePeriodRange regex guarantees valid date parts
  if (!startIso || !endIso) {
    return {};
  }

  if (eventIso >= startIso && eventIso <= endIso) {
    return {};
  }

  const message = commentFunction({
    dropOffDate: eventDateString,
    periodEnd: range.end,
    periodStart: range.start,
  });

  return periodField.confidence === 'high'
    ? { failMessage: message }
    : { reviewReason: message };
};
