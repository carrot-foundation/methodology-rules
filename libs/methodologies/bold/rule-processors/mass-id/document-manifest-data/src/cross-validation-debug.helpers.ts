import type {
  ExtractedEntityInfo,
  ExtractedEntityWithAddressInfo,
  ExtractedField,
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

import type {
  CdfCrossValidation,
  CdfTotalWeightComparison,
  EntityComparison,
  FieldComparison,
  MtrCrossValidation,
  WasteQuantityComparison,
  WasteTypeComparison,
  WasteTypeEntry,
} from './document-manifest-data.result-content.types';
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
): null | WasteQuantityComparison => {
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
    confidence: null,
    discrepancyPercentage:
      discrepancy === null ? null : `${(discrepancy * 100).toFixed(1)}%`,
    event: weighingValue ?? null,
    extracted: normalizedKg ?? null,
    extractedQuantity: matchedEntry.quantity,
    extractedUnit: matchedEntry.unit ?? null,
    isMatch:
      normalizedKg !== undefined &&
      weighingValue !== undefined &&
      discrepancy !== null &&
      discrepancy <= 0.1,
  };
};

const addressDebugInfo = (
  entity: ExtractedEntityWithAddressInfo,
  eventAddress: MethodologyAddress | undefined,
): NonNullable<EntityComparison['address']> => {
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
): EntityComparison | null => {
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

  const isMatch: boolean | null = (() => {
    if (taxIdMatch === true) {
      return true;
    }

    if (taxIdMatch === false) {
      return false;
    }

    // taxIdMatch is null (no event taxId), check name
    return eventName === undefined
      ? null
      : isNameMatch(entity.name.parsed, eventName).isMatch;
  })();

  const base = {
    confidence: entity.name.confidence,
    eventName: eventName ?? null,
    eventTaxId: eventTaxId ?? null,
    extractedName: entity.name.parsed,
    extractedTaxId: entity.taxId.parsed,
    isMatch,
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
): WasteTypeEntry => {
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

const fieldComparison = (
  field: ExtractedField<string> | undefined,
  eventValue: string | undefined,
  compareFunction: (extracted: string, event: string) => boolean = (a, b) =>
    a === b,
): FieldComparison => ({
  confidence: field?.confidence ?? null,
  event: eventValue ?? null,
  extracted: field?.parsed ?? null,
  isMatch:
    field !== undefined && eventValue !== undefined
      ? compareFunction(field.parsed, eventValue)
      : null,
});

const dateComparison = (
  field: ExtractedField<string> | undefined,
  eventDate: string | undefined,
): FieldComparison => {
  const daysDiff = computeDateDaysDiff(field?.parsed, eventDate);

  return {
    confidence: field?.confidence ?? null,
    daysDiff: daysDiff ?? null,
    event: eventDate ?? null,
    extracted: field?.parsed ?? null,
    isMatch: daysDiff == null ? null : daysDiff === 0,
  };
};

const wasteTypeComparison = (
  entries: undefined | WasteTypeEntryData[],
  eventCode: string | undefined,
  eventDescription: string | undefined,
  confidence?: ExtractionConfidence | null,
): WasteTypeComparison => {
  const debugEntries =
    entries?.map((entry) =>
      buildWasteTypeDebugEntry(entry, eventCode, eventDescription),
    ) ?? null;

  return {
    ...(confidence !== undefined && { confidence }),
    entries: debugEntries,
    eventCode: eventCode ?? null,
    eventDescription: eventDescription ?? null,
    isMatch: debugEntries?.some((e) => e.isMatch === true) ?? null,
  };
};

export const buildCrossValidationComparison = (
  extractedData: MtrExtractedData,
  eventData: MtrCrossValidationEventData,
  extractionConfidence: ExtractionConfidence,
): MtrCrossValidation => {
  const eventPlateValue = eventData.pickUpEvent
    ? getEventAttributeValue(eventData.pickUpEvent, VEHICLE_LICENSE_PLATE)
    : undefined;

  const { code: eventWasteCode, description: eventWasteDescription } =
    getWasteClassification(eventData.pickUpEvent);

  const eventIssueDate = eventData.issueDateAttribute?.value?.toString();
  const eventPlateString = eventPlateValue?.toString();

  const crossValidation: MtrCrossValidation = {
    documentNumber: fieldComparison(
      extractedData.documentNumber,
      eventData.documentNumber?.toString(),
    ),
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
    issueDate: dateComparison(extractedData.issueDate, eventIssueDate),
    receiver: entityDebugInfo(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.name,
      eventData.recyclerEvent?.participant.taxId,
      eventData.recyclerEvent?.address,
    ),
    receivingDate: dateComparison(
      extractedData.receivingDate,
      eventData.dropOffEvent?.externalCreatedAt,
    ),
    transportDate: dateComparison(
      extractedData.transportDate,
      eventData.pickUpEvent?.externalCreatedAt,
    ),
    vehiclePlate: fieldComparison(
      extractedData.vehiclePlate,
      eventPlateString,
      (a, b) => normalizeVehiclePlate(a) === normalizeVehiclePlate(b),
    ),
    wasteQuantityWeight: buildWasteQuantityDebugInfo(
      extractedData.wasteTypes?.map((entry) => toWasteTypeEntryData(entry)),
      eventWasteCode,
      eventWasteDescription,
      eventData.weighingEvents,
    ),
    wasteType: wasteTypeComparison(
      extractedData.wasteTypes?.map(toWasteTypeEntryData),
      eventWasteCode,
      eventWasteDescription,
    ),
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
): CdfTotalWeightComparison | null => {
  if (!extractedData.wasteEntries) {
    return null;
  }

  const { hasValidQuantity, totalKg } = computeCdfTotalKg(
    extractedData.wasteEntries.parsed,
  );

  return {
    confidence: extractedData.wasteEntries.confidence,
    event: documentCurrentValue,
    extracted: hasValidQuantity ? totalKg : null,
    isMatch: hasValidQuantity ? documentCurrentValue <= totalKg : null,
  };
};

export const buildCdfCrossValidationComparison = (
  extractedData: CdfExtractedData,
  eventData: CdfCrossValidationEventData,
  extractionConfidence: ExtractionConfidence,
): CdfCrossValidation => {
  const { code: eventWasteCode, description: eventWasteDescription } =
    getWasteClassification(eventData.pickUpEvent);

  const eventIssueDate = eventData.issueDateAttribute?.value?.toString();
  const periodRange = extractedData.processingPeriod
    ? parsePeriodRange(extractedData.processingPeriod.parsed)
    : undefined;

  const dropOffIso = eventData.dropOffEvent?.externalCreatedAt.split('T')[0];

  const processingPeriodIsMatch = (() => {
    if (!periodRange || !dropOffIso) {
      return null;
    }

    const toIso = (dmy: string) => {
      const [d, m, y] = dmy.split('/');

      return `${y}-${m}-${d}`;
    };

    return (
      dropOffIso >= toIso(periodRange.start) &&
      dropOffIso <= toIso(periodRange.end)
    );
  })();

  const transportManifests = extractedData.transportManifests;
  const mtrNumbersIsMatch =
    transportManifests === undefined
      ? null
      : eventData.mtrDocumentNumbers.every((number_) =>
          transportManifests.parsed.some(
            (m) => m.includes(number_) || number_.includes(m),
          ),
        );

  const crossValidation: CdfCrossValidation = {
    cdfTotalWeight: buildCdfTotalWeightDebugInfo(
      extractedData,
      eventData.documentCurrentValue,
    ),
    documentNumber: fieldComparison(
      extractedData.documentNumber,
      eventData.documentNumber?.toString(),
    ),
    generator: entityDebugInfo(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.name,
      eventData.wasteGeneratorEvent?.participant.taxId,
      eventData.wasteGeneratorEvent?.address,
    ),
    issueDate: dateComparison(extractedData.issueDate, eventIssueDate),
    mtrNumbers: {
      event: eventData.mtrDocumentNumbers,
      extracted: extractedData.transportManifests?.parsed ?? null,
      isMatch: mtrNumbersIsMatch,
    },
    processingPeriod: {
      confidence: extractedData.processingPeriod?.confidence ?? null,
      event: eventData.dropOffEvent?.externalCreatedAt ?? null,
      extracted: extractedData.processingPeriod?.parsed ?? null,
      isMatch: processingPeriodIsMatch,
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
    wasteType: wasteTypeComparison(
      extractedData.wasteEntries?.parsed,
      eventWasteCode,
      eventWasteDescription,
      extractedData.wasteEntries?.confidence ?? null,
    ),
  };

  logger.debug(
    { crossValidation, extractionConfidence },
    'Cross-validation field comparison (CDF)',
  );

  return crossValidation;
};
