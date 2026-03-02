import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';
import type { MethodologyAddress } from '@carrot-fndn/shared/types';

import { type ReviewReason } from '@carrot-fndn/shared/document-extractor';
import { isNameMatch } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';

import type { ValidationResult } from '../document-manifest-data.helpers';
import type { AttachmentCrossValidation } from '../document-manifest-data.result-content.types';

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

export const buildAddressString = (address: MethodologyAddress): string =>
  [address.street, address.number, address.city, address.countryState]
    .filter(Boolean)
    .join(', ');

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

    if (normalizedKg === undefined || normalizedKg <= 0) {
      continue;
    }

    totalKg += normalizedKg;
    hasValidQuantity = true;
  }

  return { hasValidQuantity, totalKg };
};

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

  if (normalized === 'ton' || normalized === 't' || normalized === 'tonelada') {
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
