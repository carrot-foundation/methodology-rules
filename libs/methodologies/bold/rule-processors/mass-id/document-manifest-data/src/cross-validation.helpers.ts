import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type {
  MtrExtractedData,
  WasteTypeEntryData,
} from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';
import type { MethodologyAddress } from '@carrot-fndn/shared/types';

import {
  type BaseExtractedData,
  type ExtractedEntityInfo,
  type ExtractedEntityWithAddressInfo,
  type ExtractedField,
  type ExtractionConfidence,
  type ExtractionOutput,
  type ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import {
  dateDifferenceInDays,
  getTimezoneFromAddress,
  isNameMatch,
  utcIsoToLocalDate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  DocumentManifestEventSubject,
  ValidationResult,
} from './document-manifest-data.helpers';
import type { AttachmentCrossValidation } from './document-manifest-data.result-content.types';

import { REVIEW_REASONS } from './document-manifest-data.constants';

export type CrossValidationResponse = ValidationResult & {
  crossValidation?: AttachmentCrossValidation;
  extractionMetadata?: Record<string, unknown>;
  failReasons?: ReviewReason[];
  reviewReasons?: ReviewReason[];
};

export interface FieldValidationResult {
  failReason?: ReviewReason;
  reviewReason?: ReviewReason;
}

export const buildCrossValidationResponse = (
  basicResult: ValidationResult & {
    failReasons: ReviewReason[];
    reviewReasons: ReviewReason[];
  },
  fieldReviewReasons: ReviewReason[],
  failReasons: ReviewReason[],
  crossValidation: AttachmentCrossValidation,
  passMessage?: string,
): CrossValidationResponse => {
  const reviewReasons = [...basicResult.reviewReasons, ...fieldReviewReasons];
  const allFailReasons = [...basicResult.failReasons, ...failReasons];
  const failMessages = allFailReasons.map((r) => r.description);

  if (allFailReasons.length > 0 || reviewReasons.length > 0) {
    return {
      crossValidation,
      failMessages,
      failReasons: allFailReasons,
      ...(passMessage !== undefined && { passMessage }),
      reviewReasons,
      reviewRequired: reviewReasons.length > 0,
    };
  }

  return {
    crossValidation,
    failMessages,
    ...(passMessage !== undefined && { passMessage }),
    reviewRequired: false,
  };
};

export const routeByConfidence = (
  confidence: ExtractionConfidence,
  reviewReason: ReviewReason,
): FieldValidationResult =>
  confidence === 'high' ? { failReason: reviewReason } : { reviewReason };

export const collectResults = (
  results: FieldValidationResult[],
): {
  failReasons: ReviewReason[];
  reviewReasons: ReviewReason[];
} => {
  const failReasons: ReviewReason[] = [];
  const reviewReasons: ReviewReason[] = [];

  for (const { failReason, reviewReason } of results) {
    if (failReason) {
      failReasons.push(failReason);
    }

    if (reviewReason) {
      reviewReasons.push(reviewReason);
    }
  }

  return { failReasons, reviewReasons };
};

export const validateBasicExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventSubject: DocumentManifestEventSubject,
): ValidationResult & {
  failReasons: ReviewReason[];
  reviewReasons: ReviewReason[];
} => {
  const extractedData = extractionResult.data as
    | CdfExtractedData
    | MtrExtractedData;

  if (extractionResult.data.extractionConfidence === 'low') {
    return {
      failMessages: [],
      failReasons: [],
      reviewReasons: [],
      reviewRequired: true,
    };
  }

  const failReasons: ReviewReason[] = [];
  const reviewReasons: ReviewReason[] = [];

  const eventDocumentNumber = eventSubject.documentNumber?.toString();
  const extractedDocumentNumber =
    'documentNumber' in extractedData
      ? extractedData.documentNumber
      : undefined;

  if (
    eventDocumentNumber &&
    extractedDocumentNumber &&
    extractedDocumentNumber.confidence === 'high' &&
    eventDocumentNumber !== extractedDocumentNumber.parsed
  ) {
    failReasons.push(
      REVIEW_REASONS.DOCUMENT_NUMBER_MISMATCH({
        eventDocumentNumber,
        extractedDocumentNumber: extractedDocumentNumber.parsed,
      }),
    );
  } else if (eventDocumentNumber && !extractedDocumentNumber) {
    reviewReasons.push(
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({ field: 'document number' }),
    );
  }

  const eventIssueDate = eventSubject.issueDateAttribute?.value?.toString();
  const extractedIssueDate =
    'issueDate' in extractedData ? extractedData.issueDate : undefined;

  if (
    eventIssueDate &&
    extractedIssueDate &&
    extractedIssueDate.confidence === 'high'
  ) {
    const timezone = getTimezoneFromAddress(
      eventSubject.recyclerCountryCode ?? 'BR',
    );
    const localEventIssueDate = utcIsoToLocalDate(eventIssueDate, timezone);
    const daysDiff = dateDifferenceInDays(
      localEventIssueDate,
      extractedIssueDate.parsed,
    );

    if (daysDiff !== undefined && daysDiff > 0) {
      failReasons.push(
        REVIEW_REASONS.ISSUE_DATE_MISMATCH({
          eventIssueDate,
          extractedIssueDate: extractedIssueDate.parsed,
        }),
      );
    }
  } else if (eventIssueDate && !extractedIssueDate) {
    reviewReasons.push(
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({ field: 'issue date' }),
    );
  }

  return {
    failMessages: failReasons.map((r) => r.description),
    failReasons,
    reviewReasons,
  };
};

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;

export const getWasteClassification = (
  pickUpEvent: DocumentEvent | undefined,
): { code: string | undefined; description: string | undefined } => ({
  code: pickUpEvent
    ? getEventAttributeValue(
        pickUpEvent,
        LOCAL_WASTE_CLASSIFICATION_ID,
      )?.toString()
    : undefined,
  description: pickUpEvent
    ? getEventAttributeValue(
        pickUpEvent,
        LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
      )?.toString()
    : undefined,
});

export const normalizeTaxId = (taxId: string): string =>
  taxId.replaceAll(/[\s./-]/g, '').toLowerCase();

export const validateEntityName = (
  extractedEntity: ExtractedEntityInfo | undefined,
  eventParticipantName: string | undefined,
  reviewReasonFunction: (parameters: { score: number }) => ReviewReason,
  notExtractedReviewReason?: ReviewReason,
): FieldValidationResult => {
  if (!extractedEntity) {
    return eventParticipantName !== undefined && notExtractedReviewReason
      ? { reviewReason: notExtractedReviewReason }
      : {};
  }

  if (!eventParticipantName) {
    return {};
  }

  if (extractedEntity.name.confidence !== 'high') {
    return {};
  }

  const extractedName = extractedEntity.name.parsed;
  const { isMatch, score } = isNameMatch(
    extractedName,
    eventParticipantName,
    undefined,
    true,
  );

  return isMatch
    ? {}
    : {
        reviewReason: {
          ...reviewReasonFunction({ score }),
          comparedFields: [
            {
              event: eventParticipantName,
              extracted: extractedName,
              field: 'name',
              similarity: `${(score * 100).toFixed(0)}%`,
            },
          ],
        },
      };
};

export const validateEntityTaxId = (
  extractedEntity: ExtractedEntityInfo | undefined,
  eventParticipantTaxId: string | undefined,
  mismatchReviewReasonFunction: () => ReviewReason,
  notExtractedReviewReason?: ReviewReason,
): FieldValidationResult => {
  if (!extractedEntity) {
    return eventParticipantTaxId !== undefined && notExtractedReviewReason
      ? { reviewReason: notExtractedReviewReason }
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

  return {
    failReason: {
      ...mismatchReviewReasonFunction(),
      comparedFields: [
        {
          event: eventParticipantTaxId,
          extracted: extractedTaxId,
          field: 'taxId',
        },
      ],
    },
  };
};

export const buildAddressString = (address: MethodologyAddress): string =>
  [address.street, address.number, address.city, address.countryState]
    .filter(Boolean)
    .join(', ');

export const validateEntityAddress = (
  extractedEntity: ExtractedEntityWithAddressInfo | undefined,
  eventAddress: MethodologyAddress | undefined,
  reviewReasonFunction: (parameters: { score: number }) => ReviewReason,
  notExtractedReviewReason?: ReviewReason,
): FieldValidationResult => {
  if (!extractedEntity) {
    return eventAddress !== undefined && notExtractedReviewReason
      ? { reviewReason: notExtractedReviewReason }
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

  const eventAddressString = buildAddressString(eventAddress);

  const { isMatch, score } = isNameMatch(
    extractedAddress,
    eventAddressString,
    undefined,
    true,
  );

  return isMatch
    ? {}
    : {
        reviewReason: {
          ...reviewReasonFunction({ score }),
          comparedFields: [
            {
              event: eventAddressString,
              extracted: extractedAddress,
              field: 'address',
              similarity: `${(score * 100).toFixed(0)}%`,
            },
          ],
        },
      };
};

export const DATE_TOLERANCE_DAYS = 3;

export const validateDateField = (
  extractedDate: ExtractedField<string> | undefined,
  eventDateString: string | undefined,
  reviewReasonFunction: (parameters: {
    daysDiff: number;
    eventDate: string;
    extractedDate: string;
  }) => ReviewReason,
  notExtractedReviewReason?: ReviewReason,
  timezone = 'UTC',
): FieldValidationResult => {
  if (!extractedDate) {
    return eventDateString !== undefined && notExtractedReviewReason
      ? { reviewReason: notExtractedReviewReason }
      : {};
  }

  if (!eventDateString) {
    return {};
  }

  if (extractedDate.confidence !== 'high') {
    return {};
  }

  const localEventDate = utcIsoToLocalDate(eventDateString, timezone);
  const daysDiff = dateDifferenceInDays(extractedDate.parsed, localEventDate);

  if (daysDiff === undefined || daysDiff === 0) {
    return {};
  }

  const reviewReason = {
    ...reviewReasonFunction({
      daysDiff,
      eventDate: eventDateString,
      extractedDate: extractedDate.parsed,
    }),
    comparedFields: [
      {
        event: eventDateString,
        extracted: extractedDate.parsed,
        field: 'date',
        similarity: `${daysDiff} days`,
      },
    ],
  };

  return daysDiff > DATE_TOLERANCE_DAYS
    ? { failReason: reviewReason }
    : { reviewReason };
};

export const computeCdfTotalKg = (
  entries: ReadonlyArray<{ quantity?: number; unit?: string }>,
): { hasValidQuantity: boolean; totalKg: number } => {
  let totalKg = 0;
  let hasValidQuantity = false;

  for (const entry of entries) {
    if (entry.quantity === undefined) {
      continue;
    }

    const normalizedKg = normalizeQuantityToKg(entry.quantity, entry.unit);

    if (normalizedKg === undefined) {
      continue;
    }

    totalKg += normalizedKg;
    hasValidQuantity = true;
  }

  return { hasValidQuantity, totalKg };
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

export const validateWasteQuantityDiscrepancy = (
  entries: WasteTypeEntryData[],
  eventCode: string | undefined,
  eventDescription: string | undefined,
  weighingEvents: Pick<DocumentEvent, 'value'>[],
  reviewReasonFunction: (parameters: {
    discrepancyPercentage: string;
    extractedQuantity: string;
    unit: string;
    weighingWeight: string;
  }) => ReviewReason,
): FieldValidationResult => {
  const matchedEntry = entries.find(
    (entry) => matchWasteTypeEntry(entry, eventCode, eventDescription).isMatch,
  );

  if (matchedEntry?.quantity === undefined || matchedEntry.quantity <= 0) {
    return {};
  }

  const extractedQuantityKg = normalizeQuantityToKg(
    matchedEntry.quantity,
    matchedEntry.unit,
  );

  if (extractedQuantityKg === undefined) {
    return {};
  }

  const weighingEvent = weighingEvents.find(
    (event) => event.value !== undefined && event.value > 0,
  );

  if (!weighingEvent?.value) {
    return {};
  }

  const weighingValue = weighingEvent.value;
  const discrepancy =
    Math.abs(extractedQuantityKg - weighingValue) / weighingValue;

  if (discrepancy > WEIGHT_DISCREPANCY_THRESHOLD) {
    return {
      reviewReason: {
        ...reviewReasonFunction({
          discrepancyPercentage: (discrepancy * 100).toFixed(1),
          extractedQuantity: matchedEntry.quantity.toString(),
          unit: matchedEntry.unit ?? 'kg',
          weighingWeight: weighingValue.toString(),
        }),
        comparedFields: [
          {
            event: `${weighingValue} kg`,
            extracted: `${matchedEntry.quantity} ${matchedEntry.unit ?? 'kg'}`,
            field: 'wasteQuantity',
            similarity: `${(discrepancy * 100).toFixed(1)}% discrepancy`,
          },
        ],
      },
    };
  }

  return {};
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
  reviewReasonFunction: (parameters: {
    dropOffDate: string;
    periodEnd: string;
    periodStart: string;
  }) => ReviewReason,
  notExtractedReviewReason?: ReviewReason,
  timezone = 'UTC',
): FieldValidationResult => {
  if (!periodField) {
    return eventDateString !== undefined && notExtractedReviewReason
      ? { reviewReason: notExtractedReviewReason }
      : {};
  }

  if (!eventDateString) {
    return {};
  }

  const range = parsePeriodRange(periodField.parsed);

  if (!range) {
    return notExtractedReviewReason
      ? { reviewReason: notExtractedReviewReason }
      : {};
  }

  const startIso = ddmmyyyyToIso(range.start);
  const endIso = ddmmyyyyToIso(range.end);
  const eventIso = utcIsoToLocalDate(eventDateString, timezone);

  // istanbul ignore next -- parsePeriodRange regex guarantees valid date parts
  if (!startIso || !endIso) {
    return {};
  }

  if (eventIso >= startIso && eventIso <= endIso) {
    return {};
  }

  const reviewReason = {
    ...reviewReasonFunction({
      dropOffDate: eventDateString,
      periodEnd: range.end,
      periodStart: range.start,
    }),
    comparedFields: [
      {
        event: eventIso,
        extracted: `${range.start} - ${range.end}`,
        field: 'dateWithinPeriod',
      },
    ],
  };

  return periodField.confidence === 'high'
    ? { failReason: reviewReason }
    : { reviewReason };
};
