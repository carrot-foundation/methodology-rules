import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  type BaseExtractedData,
  type ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import { toWasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import {
  getTimezoneFromAddress,
  normalizeVehiclePlate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type { DocumentManifestEventSubject } from './document-manifest-data.helpers';
import type { MtrCrossValidation } from './document-manifest-data.result-content.types';

import {
  collectResults,
  compareDateField,
  compareEntity,
  compareStringField,
  compareWasteQuantity,
  compareWasteType,
  type CrossValidationResponse,
  type EntityComparisonReasons,
  getWasteClassification,
} from './cross-validation';
import { REVIEW_REASONS } from './document-manifest-data.constants';

export {
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './cross-validation';

export interface MtrCrossValidationEventData
  extends DocumentManifestEventSubject {
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  manifestType: 'mtr';
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
}

const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;

export const validateMtrExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventData: MtrCrossValidationEventData,
): CrossValidationResponse => {
  const extractedData = extractionResult.data as MtrExtractedData;

  if (extractionResult.data.extractionConfidence === 'low') {
    return { failMessages: [], reviewRequired: true };
  }

  const eventIssueDate = eventData.issueDateAttribute?.value?.toString();
  const recyclerTimezone = getTimezoneFromAddress(
    eventData.recyclerCountryCode ?? 'BR',
  );

  const eventPlateValue = eventData.pickUpEvent
    ? getEventAttributeValue(eventData.pickUpEvent, VEHICLE_LICENSE_PLATE)
    : undefined;
  const eventPlateString = eventPlateValue?.toString();

  const { code: eventWasteCode, description: eventWasteDescription } =
    getWasteClassification(eventData.pickUpEvent);

  const entries = extractedData.wasteTypes?.map((entry) =>
    toWasteTypeEntryData(entry),
  );

  const documentNumber = compareStringField(
    extractedData.documentNumber,
    eventData.documentNumber?.toString(),
    {
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        field: 'document number',
      }),
      onMismatch: ({ event, extracted }) =>
        REVIEW_REASONS.DOCUMENT_NUMBER_MISMATCH({
          eventDocumentNumber: event,
          extractedDocumentNumber: extracted,
        }),
      routing: 'fail',
    },
  );

  const issueDate = compareDateField(extractedData.issueDate, eventIssueDate, {
    notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
      field: 'issue date',
    }),
    onMismatch: ({ event, extracted }) =>
      REVIEW_REASONS.ISSUE_DATE_MISMATCH({
        eventIssueDate: event,
        extractedIssueDate: extracted,
      }),
    timezone: recyclerTimezone,
    tolerance: 0,
  });

  const vehiclePlate = compareStringField(
    extractedData.vehiclePlate,
    eventPlateString,
    {
      compareFn: (a, b) =>
        normalizeVehiclePlate(a) === normalizeVehiclePlate(b),
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        field: 'vehicle plate',
      }),
      onMismatch: () => REVIEW_REASONS.VEHICLE_PLATE_MISMATCH(),
      routing: 'review',
    },
  );

  const receiverReasons: EntityComparisonReasons = {
    address: {
      mismatchReason: REVIEW_REASONS.RECEIVER_ADDRESS_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" event',
        field: 'receiver address',
      }),
    },
    name: {
      mismatchReason: REVIEW_REASONS.RECEIVER_NAME_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'receiver name',
      }),
    },
    taxId: {
      mismatchReason: REVIEW_REASONS.RECEIVER_TAX_ID_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'receiver tax ID',
      }),
    },
  };

  const receiver = compareEntity(
    extractedData.receiver,
    eventData.recyclerEvent?.participant.name,
    eventData.recyclerEvent?.participant.taxId,
    receiverReasons,
    eventData.recyclerEvent?.address,
  );

  const generatorReasons: EntityComparisonReasons = {
    address: {
      mismatchReason: REVIEW_REASONS.GENERATOR_ADDRESS_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" event',
        field: 'generator address',
      }),
    },
    name: {
      mismatchReason: REVIEW_REASONS.GENERATOR_NAME_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator name',
      }),
    },
    taxId: {
      mismatchReason: REVIEW_REASONS.GENERATOR_TAX_ID_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator tax ID',
      }),
    },
  };

  const generator = compareEntity(
    extractedData.generator,
    eventData.wasteGeneratorEvent?.participant.name,
    eventData.wasteGeneratorEvent?.participant.taxId,
    generatorReasons,
    eventData.wasteGeneratorEvent?.address,
  );

  const haulerReasons: EntityComparisonReasons = {
    name: {
      mismatchReason: REVIEW_REASONS.HAULER_NAME_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Hauler" participant',
        field: 'hauler name',
      }),
    },
    taxId: {
      mismatchReason: REVIEW_REASONS.HAULER_TAX_ID_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Hauler" participant',
        field: 'hauler tax ID',
      }),
    },
  };

  const hauler = compareEntity(
    extractedData.hauler,
    eventData.haulerEvent?.participant.name,
    eventData.haulerEvent?.participant.taxId,
    haulerReasons,
  );

  const pickUpTimezone = getTimezoneFromAddress(
    eventData.pickUpEvent?.address.countryCode ?? 'BR',
    eventData.pickUpEvent?.address.countryState,
  );

  const dropOffTimezone = getTimezoneFromAddress(
    eventData.dropOffEvent?.address.countryCode ?? 'BR',
    eventData.dropOffEvent?.address.countryState,
  );

  const transportDate = compareDateField(
    extractedData.transportDate,
    eventData.pickUpEvent?.externalCreatedAt,
    {
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'Pick-up event',
        field: 'transport date',
      }),
      onMismatch: ({ daysDiff, event, extracted }) =>
        REVIEW_REASONS.TRANSPORT_DATE_MISMATCH({
          daysDiff,
          eventDate: event,
          extractedDate: extracted,
        }),
      timezone: pickUpTimezone,
    },
  );

  const receivingDate = compareDateField(
    extractedData.receivingDate,
    eventData.dropOffEvent?.externalCreatedAt,
    {
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'Drop-off event',
        field: 'receiving date',
      }),
      onMismatch: ({ daysDiff, event, extracted }) =>
        REVIEW_REASONS.RECEIVING_DATE_MISMATCH({
          daysDiff,
          eventDate: event,
          extractedDate: extracted,
        }),
      timezone: dropOffTimezone,
    },
  );

  const wasteType = compareWasteType(
    entries,
    eventWasteCode,
    eventWasteDescription,
    {
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        field: 'waste type entries',
      }),
      onMismatch: REVIEW_REASONS.WASTE_TYPE_MISMATCH,
    },
  );

  const wasteQuantityWeight = compareWasteQuantity(
    entries,
    eventWasteCode,
    eventWasteDescription,
    eventData.weighingEvents,
    {
      onMismatch: REVIEW_REASONS.WASTE_QUANTITY_WEIGHT_MISMATCH,
    },
  );

  const crossValidation: MtrCrossValidation = {
    documentNumber: documentNumber.debug,
    generator: generator.debug,
    hauler: hauler.debug,
    issueDate: issueDate.debug,
    receiver: receiver.debug,
    receivingDate: receivingDate.debug,
    transportDate: transportDate.debug,
    vehiclePlate: vehiclePlate.debug,
    wasteQuantityWeight: wasteQuantityWeight.debug,
    wasteType: wasteType.debug,
  };

  const { failReasons, reviewReasons } = collectResults([
    ...documentNumber.validation,
    ...issueDate.validation,
    ...vehiclePlate.validation,
    ...receiver.validation,
    ...generator.validation,
    ...hauler.validation,
    ...transportDate.validation,
    ...receivingDate.validation,
    ...wasteType.validation,
    ...wasteQuantityWeight.validation,
  ]);

  const failMessages = failReasons.map((r) => r.description);

  if (failReasons.length > 0 || reviewReasons.length > 0) {
    return {
      crossValidation,
      failMessages,
      failReasons,
      reviewReasons,
      reviewRequired: reviewReasons.length > 0,
    };
  }

  return {
    crossValidation,
    failMessages,
    reviewRequired: false,
  };
};
