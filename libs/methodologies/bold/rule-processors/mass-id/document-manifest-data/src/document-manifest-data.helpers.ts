import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type {
  MtrExtractedData,
  WasteTypeEntry,
} from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  type AttachmentInfo,
  type BaseExtractedData,
  type DocumentExtractorConfig,
  type DocumentType,
  type ExtractedField,
  type ExtractionConfidence,
  type ExtractionOutput,
  getDefaultLayouts,
} from '@carrot-fndn/shared/document-extractor';
import {
  dateDifferenceInDays,
  isNameMatch,
  isNil,
  isNonEmptyString,
  logger,
  normalizeVehiclePlate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { getAttachmentS3Key } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type MethodologyDocumentEventAttachment,
  type MethodologyDocumentEventAttribute,
  type MethodologyDocumentEventAttributeValue,
} from '@carrot-fndn/shared/types';

import { CROSS_VALIDATION_COMMENTS } from './document-manifest-data.constants';

export type {
  AttachmentInfo,
  CrossValidationResult,
  CrossValidationValidateResult,
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

export interface MtrCrossValidationEventData
  extends DocumentManifestEventSubject {
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
}

const DATE_TOLERANCE_DAYS = 3;

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  VEHICLE_LICENSE_PLATE,
} = DocumentEventAttributeName;

interface FieldValidationResult {
  failMessage?: string;
  reviewReason?: string;
}

const routeByConfidence = (
  confidence: ExtractionConfidence,
  message: string,
): FieldValidationResult =>
  confidence === 'high' ? { failMessage: message } : { reviewReason: message };

const collectResults = (
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

const validateHighConfidenceField = (
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

  const issueDateMismatch = validateHighConfidenceField(
    eventSubject.issueDateAttribute?.value?.toString(),
    'issueDate' in extractedData ? extractedData.issueDate : undefined,
    ({ eventValue, extractedValue }) =>
      CROSS_VALIDATION_COMMENTS.ISSUE_DATE_MISMATCH({
        eventIssueDate: eventValue,
        extractedIssueDate: extractedValue,
      }),
  );

  if (issueDateMismatch) {
    failMessages.push(issueDateMismatch);
  }

  return { failMessages };
};

const validateVehiclePlate = (
  extractedData: MtrExtractedData,
  pickUpEvent: DocumentEvent | undefined,
): FieldValidationResult => {
  if (!pickUpEvent || !extractedData.vehiclePlate) {
    return {};
  }

  const eventPlate = getEventAttributeValue(
    pickUpEvent,
    VEHICLE_LICENSE_PLATE,
  )?.toString();

  if (!eventPlate) {
    return {};
  }

  const normalizedEventPlate = normalizeVehiclePlate(eventPlate);
  const normalizedExtractedPlate = normalizeVehiclePlate(
    extractedData.vehiclePlate.parsed,
  );

  if (normalizedEventPlate === normalizedExtractedPlate) {
    return {};
  }

  const message = CROSS_VALIDATION_COMMENTS.VEHICLE_PLATE_MISMATCH({
    eventPlate,
    extractedPlate: extractedData.vehiclePlate.parsed,
  });

  return routeByConfidence(extractedData.vehiclePlate.confidence, message);
};

const validateEntityName = (
  extractedEntity: MtrExtractedData['generator'] | undefined,
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

  if (extractedEntity.confidence !== 'high') {
    return {};
  }

  const extractedName = extractedEntity.parsed.name;
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

const validateDateField = (
  extractedDate: MtrExtractedData['transportDate'],
  eventDateString: string | undefined,
  commentFunction: (parameters: {
    daysDiff: number;
    eventDate: string;
    extractedDate: string;
  }) => string,
): FieldValidationResult => {
  if (!extractedDate || !eventDateString) {
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

const normalizeWasteCode = (code: string): string =>
  code.replaceAll(/\s+/g, '').toLowerCase();

const isWasteTypeEntryMatch = (
  entry: WasteTypeEntry,
  eventCode: string | undefined,
  eventDescription: string | undefined,
): boolean => {
  if (entry.code && eventCode && eventCode.length > 0) {
    return (
      normalizeWasteCode(eventCode) === normalizeWasteCode(entry.code) &&
      eventDescription !== undefined &&
      isNameMatch(entry.description, eventDescription).isMatch
    );
  }

  if (eventDescription) {
    return isNameMatch(entry.description, eventDescription).isMatch;
  }

  return false;
};

const validateWasteType = (
  extractedData: MtrExtractedData,
  pickUpEvent: DocumentEvent | undefined,
): FieldValidationResult => {
  if (!pickUpEvent || !extractedData.wasteTypes) {
    return {};
  }

  const eventCode = getEventAttributeValue(
    pickUpEvent,
    LOCAL_WASTE_CLASSIFICATION_ID,
  )?.toString();

  const eventDescription = getEventAttributeValue(
    pickUpEvent,
    LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  )?.toString();

  if (!eventCode && !eventDescription) {
    return {};
  }

  const entries = extractedData.wasteTypes.parsed;
  const hasMatch = entries.some((entry) =>
    isWasteTypeEntryMatch(entry, eventCode, eventDescription),
  );

  if (hasMatch) {
    return {};
  }

  const extractedSummary = entries
    .map((e) => (e.code ? `${e.code} - ${e.description}` : e.description))
    .join(', ');

  // istanbul ignore next -- eventDescription is guaranteed to be defined when eventCode is absent (early return above)
  const eventSummary = eventCode
    ? `${eventCode} - ${eventDescription ?? ''}`
    : (eventDescription ?? '');

  return {
    reviewReason: CROSS_VALIDATION_COMMENTS.WASTE_TYPE_MISMATCH({
      eventClassification: eventSummary,
      extractedEntries: extractedSummary,
    }),
  };
};

export const validateMtrExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventData: MtrCrossValidationEventData,
): ValidationResult & { reviewReasons?: string[] } => {
  const basicResult = validateBasicExtractedData(extractionResult, eventData);

  if (basicResult.reviewRequired === true) {
    return basicResult;
  }

  const extractedData = extractionResult.data as MtrExtractedData;

  const { failMessages, reviewReasons } = collectResults([
    validateVehiclePlate(extractedData, eventData.pickUpEvent),
    validateEntityName(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.name,
      CROSS_VALIDATION_COMMENTS.RECEIVER_NAME_MISMATCH,
    ),
    validateEntityName(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.name,
      CROSS_VALIDATION_COMMENTS.GENERATOR_NAME_MISMATCH,
    ),
    validateDateField(
      extractedData.transportDate,
      eventData.pickUpEvent?.externalCreatedAt,
      CROSS_VALIDATION_COMMENTS.TRANSPORT_DATE_MISMATCH,
    ),
    validateDateField(
      extractedData.receivingDate,
      eventData.dropOffEvent?.externalCreatedAt,
      CROSS_VALIDATION_COMMENTS.RECEIVING_DATE_MISMATCH,
    ),
    validateWasteType(extractedData, eventData.pickUpEvent),
  ]);

  const allFailMessages = [...basicResult.failMessages, ...failMessages];

  if (reviewReasons.length > 0) {
    return {
      failMessages: allFailMessages,
      reviewReasons,
      reviewRequired: true,
    };
  }

  return {
    failMessages: allFailMessages,
    reviewRequired: false,
  };
};
