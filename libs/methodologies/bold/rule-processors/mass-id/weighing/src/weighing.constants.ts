import {
  DocumentEventAttributeName,
  DocumentEventContainerType,
  DocumentEventName,
  DocumentEventScaleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

export const NET_WEIGHT_CALCULATION_TOLERANCE = 0.1;

const supportedFormats = Object.values(
  MethodologyDocumentEventAttributeFormat,
).join(', ');

export const PASSED_RESULT_COMMENTS = {
  PASSED_WITH_CONTAINER_QUANTITY_EXCEPTION: (originalPassMessage: string) =>
    `${originalPassMessage} The omission of the "Container Quantity" is permitted under an approved exception granted to this recycler for the duration of the accreditation period.`,
  PASSED_WITH_EXCEPTION: (originalPassMessage: string) =>
    `${originalPassMessage} The omission of the "Container Capacity" is permitted under an approved exception granted to this recycler for the duration of the accreditation period.`,
  PASSED_WITH_SCALE_TICKET_VALIDATION: (originalPassMessage: string) =>
    `${originalPassMessage} Scale ticket validation was successful.`,
  PASSED_WITH_TARE_EXCEPTION: (originalPassMessage: string) =>
    `${originalPassMessage} The omission of the "Tare" is permitted under an approved exception granted to this recycler for the duration of the accreditation period.`,
  SINGLE_STEP: `The weighing event was captured as a single-step process, and all required attributes are valid.`,
  TRANSPORT_MANIFEST: `The "${DocumentEventName.Weighing}" event was captured from the "${DocumentEventName['Transport Manifest']}", and all required attributes are valid.`,
  TWO_STEP: `The "${DocumentEventName.Weighing}" event was captured in two steps, and all required attributes are valid.`,
} as const;

export const INVALID_RESULT_COMMENTS = {
  CONTAINER_CAPACITY_FORMAT: `The "Container Capacity" format must be one of the supported formats: ${supportedFormats}.`,
  CONTAINER_QUANTITY: `The "Container Quantity" must not be declared when the "Container Type" is "${DocumentEventContainerType.Truck}".`,
  GROSS_WEIGHT_FORMAT: `The "Gross Weight" format must be one of the supported formats: ${supportedFormats}.`,
  NET_WEIGHT_CALCULATION: ({
    calculatedNetWeight,
    containerQuantity,
    eventValue,
    grossWeight,
    tare,
  }: {
    calculatedNetWeight: number;
    containerQuantity: number;
    eventValue: number;
    grossWeight: number;
    tare: number;
  }) =>
    `The calculated net weight (${calculatedNetWeight}) differs from the declared "Event Value" (${eventValue}) by more than ${NET_WEIGHT_CALCULATION_TOLERANCE} kg:  ${grossWeight} - (${tare} × ${containerQuantity}) ≈ ${calculatedNetWeight} [formula: gross_weight - (tare * container_quantity)]`,
  SCALE_TICKET_EXTRACTION_FAILED:
    'The scale ticket could not be processed for verification.',
  SCALE_TICKET_MISSING_SOURCE:
    'Scale ticket verification was required but no valid source for the scale ticket file could be determined.',
  SCALE_TICKET_NET_WEIGHT_MISMATCH: ({
    expectedNetWeight,
    ticketNetWeight,
  }: {
    expectedNetWeight: number;
    ticketNetWeight: number;
  }) =>
    `The net weight extracted from the scale ticket (${ticketNetWeight}) does not match the "Event Value" (${expectedNetWeight}).`,
  SCALE_TICKET_UNSUPPORTED_LAYOUT: (layout: unknown) =>
    `The scale ticket layout "${String(
      layout,
    )}" specified in "${DocumentEventAttributeName['Required Additional Verifications']}" is not supported.`,
  SCALE_TYPE: (scaleType: unknown) =>
    `The "Scale Type" "${String(scaleType)}" is not supported by the methodology.`,
  SCALE_TYPE_MISMATCH: (scaleType: unknown, accreditationScaleType: unknown) =>
    `The provided "Scale Type" "${String(scaleType)}" does not match the accreditation scale type "${String(accreditationScaleType)}".`,
  TARE_FORMAT: `The "Tare" format must be one of the supported formats.`,
  TWO_STEP_CONTAINER_TYPE: (containerType: unknown) =>
    `The "Container Type" for two-step weighing must be ${DocumentEventContainerType.Truck}, but "${String(containerType)}" was provided.`,
  TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS:
    'The first weighing participant does not match the second weighing participant.',
  TWO_STEP_WEIGHING_EVENT_SCALE_TYPE: (scaleType: unknown) =>
    `The "Scale Type" for two-step weighing must be "${DocumentEventScaleType['Weighbridge (Truck Scale)']}", but "${String(scaleType)}" was provided.`,
  TWO_STEP_WEIGHING_EVENT_VALUES: ({
    attributeName,
    firstValue,
    secondValue,
  }: {
    attributeName: unknown;
    firstValue: unknown;
    secondValue: unknown;
  }) =>
    `The first weighing "${String(attributeName)}" value "${String(firstValue)}" does not match the second weighing "${String(attributeName)}" value "${String(secondValue)}"`,
  VEHICLE_LICENSE_PLATE_FORMAT: `The "Vehicle License Plate" format is invalid.`,
  WEIGHING_CAPTURE_METHOD: (captureMethod: unknown) =>
    `The "Weighing Capture Method" "${String(captureMethod)}" is not supported by the methodology.`,
} as const;

export const WRONG_FORMAT_RESULT_COMMENTS = {
  CONTAINER_CAPACITY: `The "Container Capacity" must be greater than 0.`,
  CONTAINER_QUANTITY: `The "Container Quantity" must be greater than 0 unless the "Container Type" is "${DocumentEventContainerType.Truck}".`,
  CONTAINER_TYPE: `The "Container Type" must be provided.`,
  DESCRIPTION: `The "${DocumentEventName.Weighing}" event must have a "Description", but none was provided.`,
  EVENT_VALUE: (eventValue: unknown) =>
    `The "Event Value" must be provided and greater than 0. Received "${String(eventValue)}".`,
  GROSS_WEIGHT: (grossWeight: unknown) =>
    `The "Gross Weight" must be provided and greater than 0. Received "${String(grossWeight)}".`,
  TARE: (tare: unknown) =>
    `The "Tare" must be provided and greater than 0. Received "${String(tare)}"`,
} as const;

export const NOT_FOUND_RESULT_COMMENTS = {
  ACCREDITATION_EVENT: `The related "Scale Validation" event was not found.`,
  MORE_THAN_TWO_WEIGHING_EVENTS: `More than two "${DocumentEventName.Weighing}" events were found, which is not supported.`,
  NO_WEIGHING_EVENTS: `No "${DocumentEventName.Weighing}" events were found in the document.`,
} as const;
