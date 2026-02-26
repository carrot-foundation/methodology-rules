import type {
  ExtractedEntityInfo,
  ExtractedEntityWithAddressInfo,
  ExtractionConfidence,
} from '@carrot-fndn/shared/document-extractor';
import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type {
  MtrExtractedData,
  WasteTypeEntryData,
} from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { MethodologyAddress } from '@carrot-fndn/shared/types';

import { toWasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import {
  dateDifferenceInDays,
  isNameMatch,
  logger,
  normalizeVehiclePlate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type { LayoutValidationConfig } from './document-manifest-data.helpers';
import type { CdfCrossValidationEventData } from './recycling-manifest-cross-validation.helpers';
import type { MtrCrossValidationEventData } from './transport-manifest-cross-validation.helpers';

import {
  buildAddressString,
  computeCdfTotalKg,
  getWasteClassification,
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  normalizeTaxId,
  parsePeriodRange,
} from './cross-validation.helpers';

const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;

const buildWasteQuantityDebugInfo = (
  entries: undefined | WasteTypeEntryData[],
  eventWasteCode: string | undefined,
  eventWasteDescription: string | undefined,
  weighingEvents: DocumentEvent[],
): null | Record<string, unknown> => {
  if (!entries || entries.length === 0) {
    return null;
  }

  const matchedEntry = entries.find(
    (entry) =>
      matchWasteTypeEntry(entry, eventWasteCode, eventWasteDescription).isMatch,
  );

  if (matchedEntry?.quantity === undefined) {
    return null;
  }

  const normalizedKg = normalizeQuantityToKg(
    matchedEntry.quantity,
    matchedEntry.unit,
  );

  const weighingEvent = weighingEvents.find(
    (event) => event.value !== undefined && event.value > 0,
  );

  const weighingValue = weighingEvent?.value;
  const discrepancy =
    normalizedKg !== undefined &&
    weighingValue !== undefined &&
    weighingValue > 0
      ? Math.abs(normalizedKg - weighingValue) / weighingValue
      : null;

  return {
    discrepancyPercentage:
      discrepancy === null ? null : `${(discrepancy * 100).toFixed(1)}%`,
    extractedQuantity: matchedEntry.quantity,
    extractedUnit: matchedEntry.unit ?? null,
    normalizedKg: normalizedKg ?? null,
    weighingValue: weighingValue ?? null,
  };
};

const addressDebugInfo = (
  entity: ExtractedEntityWithAddressInfo,
  eventAddress: MethodologyAddress | undefined,
) => {
  const extractedAddress = [
    entity.address.parsed,
    entity.city.parsed,
    entity.state.parsed,
  ]
    .filter(Boolean)
    .join(', ');

  if (!eventAddress) {
    return {
      confidence: entity.address.confidence,
      extracted: extractedAddress,
    };
  }

  const eventAddressString = buildAddressString(eventAddress);
  const { score } = isNameMatch(extractedAddress, eventAddressString);

  return {
    addressSimilarity: `${(score * 100).toFixed(0)}%`,
    confidence: entity.address.confidence,
    event: eventAddressString,
    extracted: extractedAddress,
  };
};

const entityDebugInfo = (
  entity: ExtractedEntityInfo | undefined,
  eventName: string | undefined,
  eventTaxId: string | undefined,
  eventAddress?: MethodologyAddress,
) => {
  if (!entity) {
    return null;
  }

  const nameSimilarity =
    eventName === undefined
      ? null
      : `${(isNameMatch(entity.name.parsed, eventName).score * 100).toFixed(0)}%`;

  const taxIdMatch =
    eventTaxId === undefined
      ? null
      : normalizeTaxId(entity.taxId.parsed) === normalizeTaxId(eventTaxId);

  const base = {
    confidence: entity.name.confidence,
    eventName: eventName ?? null,
    eventTaxId: eventTaxId ?? null,
    extractedName: entity.name.parsed,
    extractedTaxId: entity.taxId.parsed,
    nameSimilarity,
    taxIdMatch,
  };

  const hasAddress =
    'address' in entity && 'city' in entity && 'state' in entity;

  if (hasAddress) {
    return {
      ...base,
      address: addressDebugInfo(
        entity as ExtractedEntityWithAddressInfo,
        eventAddress,
      ),
    };
  }

  return base;
};

const computeDateDaysDiff = (
  extractedDate: string | undefined,
  eventDate: string | undefined,
): null | number | undefined =>
  extractedDate !== undefined && eventDate !== undefined
    ? dateDifferenceInDays(extractedDate, eventDate)
    : null;

const buildWasteTypeDebugEntry = (
  entry: WasteTypeEntryData,
  eventWasteCode: string | undefined,
  eventWasteDescription: string | undefined,
): Record<string, unknown> => {
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
    extracted: entry.code
      ? `${entry.code} - ${entry.description}`
      : entry.description,
    isCodeMatch: match.isCodeMatch,
    isMatch: match.isMatch,
  };
};

export const buildCrossValidationComparison = (
  extractedData: MtrExtractedData,
  eventData: MtrCrossValidationEventData,
  extractionConfidence: ExtractionConfidence,
): Record<string, unknown> => {
  const eventPlateValue = eventData.pickUpEvent
    ? getEventAttributeValue(eventData.pickUpEvent, VEHICLE_LICENSE_PLATE)
    : undefined;

  const { code: eventWasteCode, description: eventWasteDescription } =
    getWasteClassification(eventData.pickUpEvent);

  const eventIssueDate = eventData.issueDateAttribute?.value?.toString();
  const eventPlateString = eventPlateValue?.toString();

  const crossValidation: Record<string, unknown> = {
    documentNumber: {
      confidence: extractedData.documentNumber?.confidence ?? null,
      event: eventData.documentNumber?.toString() ?? null,
      extracted: extractedData.documentNumber?.parsed ?? null,
      isMatch:
        eventData.documentNumber?.toString() ===
        extractedData.documentNumber?.parsed,
    },
    generator: entityDebugInfo(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.name,
      eventData.wasteGeneratorEvent?.participant.taxId,
      eventData.wasteGeneratorEvent?.address,
    ),
    hauler: entityDebugInfo(
      extractedData.hauler,
      eventData.haulerEvent?.participant.name,
      eventData.haulerEvent?.participant.taxId,
      eventData.haulerEvent?.address,
    ),
    issueDate: {
      confidence: extractedData.issueDate?.confidence ?? null,
      daysDiff: computeDateDaysDiff(
        eventIssueDate,
        extractedData.issueDate?.parsed,
      ),
      event: eventIssueDate ?? null,
      extracted: extractedData.issueDate?.parsed ?? null,
    },
    receiver: entityDebugInfo(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.name,
      eventData.recyclerEvent?.participant.taxId,
      eventData.recyclerEvent?.address,
    ),
    receivingDate: {
      confidence: extractedData.receivingDate?.confidence ?? null,
      daysDiff: computeDateDaysDiff(
        extractedData.receivingDate?.parsed,
        eventData.dropOffEvent?.externalCreatedAt,
      ),
      event: eventData.dropOffEvent?.externalCreatedAt ?? null,
      extracted: extractedData.receivingDate?.parsed ?? null,
    },
    transportDate: {
      confidence: extractedData.transportDate?.confidence ?? null,
      daysDiff: computeDateDaysDiff(
        extractedData.transportDate?.parsed,
        eventData.pickUpEvent?.externalCreatedAt,
      ),
      event: eventData.pickUpEvent?.externalCreatedAt ?? null,
      extracted: extractedData.transportDate?.parsed ?? null,
    },
    vehiclePlate: {
      confidence: extractedData.vehiclePlate?.confidence ?? null,
      event: eventPlateString ?? null,
      extracted: extractedData.vehiclePlate?.parsed ?? null,
      isMatch:
        eventPlateString !== undefined &&
        extractedData.vehiclePlate !== undefined
          ? normalizeVehiclePlate(eventPlateString) ===
            normalizeVehiclePlate(extractedData.vehiclePlate.parsed)
          : null,
    },
    wasteQuantityWeight: buildWasteQuantityDebugInfo(
      extractedData.wasteTypes?.map((entry) => toWasteTypeEntryData(entry)),
      eventWasteCode,
      eventWasteDescription,
      eventData.weighingEvents,
    ),
    wasteType: {
      entries:
        extractedData.wasteTypes?.map((extractedEntry) =>
          buildWasteTypeDebugEntry(
            toWasteTypeEntryData(extractedEntry),
            eventWasteCode,
            eventWasteDescription,
          ),
        ) ?? null,
      eventCode: eventWasteCode ?? null,
      eventDescription: eventWasteDescription ?? null,
    },
  };

  logger.debug(
    { crossValidation, extractionConfidence },
    'Cross-validation field comparison (MTR)',
  );

  return crossValidation;
};

const buildCdfTotalWeightDebugInfo = (
  extractedData: CdfExtractedData,
  documentCurrentValue: number,
): null | Record<string, unknown> => {
  if (!extractedData.wasteEntries) {
    return null;
  }

  const { hasValidQuantity, totalKg } = computeCdfTotalKg(
    extractedData.wasteEntries.parsed,
  );

  return {
    confidence: extractedData.wasteEntries.confidence,
    documentCurrentValue,
    extractedTotalKg: hasValidQuantity ? totalKg : null,
    isValid: hasValidQuantity ? documentCurrentValue <= totalKg : null,
  };
};

export const buildCdfCrossValidationComparison = (
  extractedData: CdfExtractedData,
  eventData: CdfCrossValidationEventData,
  extractionConfidence: ExtractionConfidence,
  layoutValidationConfig: LayoutValidationConfig = {},
): Record<string, unknown> => {
  const { code: eventWasteCode, description: eventWasteDescription } =
    getWasteClassification(eventData.pickUpEvent);

  const eventIssueDate = eventData.issueDateAttribute?.value?.toString();
  const periodRange = extractedData.processingPeriod
    ? parsePeriodRange(extractedData.processingPeriod.parsed)
    : undefined;

  const crossValidation: Record<string, unknown> = {
    cdfTotalWeight: buildCdfTotalWeightDebugInfo(
      extractedData,
      eventData.documentCurrentValue,
    ),
    documentNumber: {
      confidence: extractedData.documentNumber?.confidence ?? null,
      event: eventData.documentNumber?.toString() ?? null,
      extracted: extractedData.documentNumber?.parsed ?? null,
      isMatch:
        eventData.documentNumber?.toString() ===
        extractedData.documentNumber?.parsed,
    },
    generator: entityDebugInfo(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.name,
      eventData.wasteGeneratorEvent?.participant.taxId,
      eventData.wasteGeneratorEvent?.address,
    ),
    issueDate: {
      confidence: extractedData.issueDate?.confidence ?? null,
      daysDiff: computeDateDaysDiff(
        eventIssueDate,
        extractedData.issueDate?.parsed,
      ),
      event: eventIssueDate ?? null,
      extracted: extractedData.issueDate?.parsed ?? null,
    },
    layoutConfig: layoutValidationConfig,
    mtrNumbers: {
      eventMtrNumbers: eventData.mtrDocumentNumbers,
      extractedManifests: extractedData.transportManifests?.parsed ?? null,
    },
    processingPeriod: {
      confidence: extractedData.processingPeriod?.confidence ?? null,
      dropOffDate: eventData.dropOffEvent?.externalCreatedAt ?? null,
      extracted: extractedData.processingPeriod?.parsed ?? null,
      ...(periodRange && {
        end: periodRange.end,
        start: periodRange.start,
      }),
    },
    recycler: entityDebugInfo(
      extractedData.recycler,
      eventData.recyclerEvent?.participant.name,
      eventData.recyclerEvent?.participant.taxId,
    ),
    wasteQuantityWeight: buildWasteQuantityDebugInfo(
      extractedData.wasteEntries?.parsed,
      eventWasteCode,
      eventWasteDescription,
      eventData.weighingEvents,
    ),
    wasteType: {
      confidence: extractedData.wasteEntries?.confidence ?? null,
      entries:
        extractedData.wasteEntries?.parsed.map((entry) =>
          buildWasteTypeDebugEntry(
            entry,
            eventWasteCode,
            eventWasteDescription,
          ),
        ) ?? null,
      eventCode: eventWasteCode ?? null,
      eventDescription: eventWasteDescription ?? null,
    },
  };

  logger.debug(
    { crossValidation, extractionConfidence },
    'Cross-validation field comparison (CDF)',
  );

  return crossValidation;
};
