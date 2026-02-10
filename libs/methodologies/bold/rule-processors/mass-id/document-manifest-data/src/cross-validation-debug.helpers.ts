import type {
  EntityInfo,
  ExtractedField,
  ExtractionConfidence,
} from '@carrot-fndn/shared/document-extractor';
import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  dateDifferenceInDays,
  isNameMatch,
  logger,
  normalizeVehiclePlate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';

import type { MtrCrossValidationEventData } from './document-manifest-data.helpers';

import {
  matchWasteTypeEntry,
  normalizeTaxId,
} from './document-manifest-data.helpers';

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  VEHICLE_LICENSE_PLATE,
} = DocumentEventAttributeName;

const entityDebugInfo = (
  entity: ExtractedField<EntityInfo> | undefined,
  eventName: string | undefined,
  eventTaxId: string | undefined,
  showValues: boolean,
) => {
  if (!entity) {
    return null;
  }

  const nameSimilarity =
    eventName === undefined
      ? null
      : `${(isNameMatch(entity.parsed.name, eventName).score * 100).toFixed(0)}%`;

  const taxIdMatch =
    eventTaxId === undefined
      ? null
      : normalizeTaxId(entity.parsed.taxId) === normalizeTaxId(eventTaxId);

  return {
    confidence: entity.confidence,
    nameSimilarity,
    taxIdMatch,
    ...(showValues && {
      eventName: eventName ?? null,
      eventTaxId: eventTaxId ?? null,
      extractedName: entity.parsed.name,
      extractedTaxId: entity.parsed.taxId,
    }),
  };
};

const computeDateDaysDiff = (
  extractedDate: string | undefined,
  eventDate: string | undefined,
): null | number | undefined =>
  extractedDate !== undefined && eventDate !== undefined
    ? dateDifferenceInDays(extractedDate, eventDate)
    : null;

export const logCrossValidationComparison = (
  extractedData: MtrExtractedData,
  eventData: MtrCrossValidationEventData,
  extractionConfidence: ExtractionConfidence,
): void => {
  const showValues = process.env['DEBUG'] === 'true';

  const eventPlateValue = eventData.pickUpEvent
    ? getEventAttributeValue(eventData.pickUpEvent, VEHICLE_LICENSE_PLATE)
    : undefined;

  const eventWasteCode = eventData.pickUpEvent
    ? getEventAttributeValue(
        eventData.pickUpEvent,
        LOCAL_WASTE_CLASSIFICATION_ID,
      )?.toString()
    : undefined;

  const eventWasteDescription = eventData.pickUpEvent
    ? getEventAttributeValue(
        eventData.pickUpEvent,
        LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
      )?.toString()
    : undefined;

  const eventIssueDate = eventData.issueDateAttribute?.value?.toString();
  const eventPlateString = eventPlateValue?.toString();

  logger.debug(
    {
      crossValidation: {
        documentNumber: {
          confidence: extractedData.documentNumber.confidence,
          isMatch:
            eventData.documentNumber?.toString() ===
            extractedData.documentNumber.parsed,
          ...(showValues && {
            event: eventData.documentNumber?.toString() ?? null,
            extracted: extractedData.documentNumber.parsed,
          }),
        },
        generator: entityDebugInfo(
          extractedData.generator,
          eventData.wasteGeneratorEvent?.participant.name,
          eventData.wasteGeneratorEvent?.participant.taxId,
          showValues,
        ),
        hauler: entityDebugInfo(
          extractedData.hauler,
          eventData.haulerEvent?.participant.name,
          eventData.haulerEvent?.participant.taxId,
          showValues,
        ),
        issueDate: {
          confidence: extractedData.issueDate.confidence,
          daysDiff: computeDateDaysDiff(
            eventIssueDate,
            extractedData.issueDate.parsed,
          ),
          ...(showValues && {
            event: eventIssueDate ?? null,
            extracted: extractedData.issueDate.parsed,
          }),
        },
        receiver: entityDebugInfo(
          extractedData.receiver,
          eventData.recyclerEvent?.participant.name,
          eventData.recyclerEvent?.participant.taxId,
          showValues,
        ),
        receivingDate: {
          confidence: extractedData.receivingDate?.confidence ?? null,
          daysDiff: computeDateDaysDiff(
            extractedData.receivingDate?.parsed,
            eventData.dropOffEvent?.externalCreatedAt,
          ),
          ...(showValues && {
            event: eventData.dropOffEvent?.externalCreatedAt ?? null,
            extracted: extractedData.receivingDate?.parsed ?? null,
          }),
        },
        transportDate: {
          confidence: extractedData.transportDate?.confidence ?? null,
          daysDiff: computeDateDaysDiff(
            extractedData.transportDate?.parsed,
            eventData.pickUpEvent?.externalCreatedAt,
          ),
          ...(showValues && {
            event: eventData.pickUpEvent?.externalCreatedAt ?? null,
            extracted: extractedData.transportDate?.parsed ?? null,
          }),
        },
        vehiclePlate: {
          confidence: extractedData.vehiclePlate?.confidence ?? null,
          isMatch:
            eventPlateString !== undefined &&
            extractedData.vehiclePlate !== undefined
              ? normalizeVehiclePlate(eventPlateString) ===
                normalizeVehiclePlate(extractedData.vehiclePlate.parsed)
              : null,
          ...(showValues && {
            event: eventPlateString ?? null,
            extracted: extractedData.vehiclePlate?.parsed ?? null,
          }),
        },
        wasteType: {
          confidence: extractedData.wasteTypes?.confidence ?? null,
          entries:
            extractedData.wasteTypes?.parsed.map((entry) => {
              const match = matchWasteTypeEntry(
                entry,
                eventWasteCode,
                eventWasteDescription,
              );

              return {
                descriptionSimilarity:
                  match.descriptionSimilarity === null
                    ? null
                    : `${(match.descriptionSimilarity * 100).toFixed(0)}%`,
                isCodeMatch: match.isCodeMatch,
                isMatch: match.isMatch,
                ...(showValues && {
                  extracted: entry.code
                    ? `${entry.code} - ${entry.description}`
                    : entry.description,
                }),
              };
            }) ?? null,
          ...(showValues && {
            eventCode: eventWasteCode ?? null,
            eventDescription: eventWasteDescription ?? null,
          }),
        },
      },
      extractionConfidence,
    },
    'Cross-validation field comparison',
  );
};
