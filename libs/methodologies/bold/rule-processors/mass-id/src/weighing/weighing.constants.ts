import {
  DocumentEventAttributeName,
  DocumentEventContainerType,
  DocumentEventName,
  DocumentEventScaleType,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

const { TRANSPORT_MANIFEST, WEIGHING } = DocumentEventName;
const {
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DESCRIPTION,
  GROSS_WEIGHT,
  MASS_NET_WEIGHT,
  SCALE_HOMOLOGATION,
  SCALE_TYPE,
  TARE,
  VEHICLE_LICENSE_PLATE,
  VEHICLE_TYPE,
  WEIGHING_CAPTURE_METHOD,
} = DocumentEventAttributeName;
const { TRUCK } = DocumentEventVehicleType;

export const NET_WEIGHT_CALCULATION_TOLERANCE = 0.1;

const supportedFormats = Object.values(
  MethodologyDocumentEventAttributeFormat,
).join(', ');

export const APPROVED_RESULT_COMMENTS = {
  APPROVED_WITH_EXCEPTION: (originalApproveMessage: string) =>
    `${originalApproveMessage} The omission of the "${CONTAINER_CAPACITY}" permitted under an approved exception granted to this recycler for the duration of the homologation period.`,
  SINGLE_STEP: `The weighing event was captured as a single-step process, and all required attributes are valid.`,
  TRANSPORT_MANIFEST: `The "${WEIGHING}" event was captured from the "${TRANSPORT_MANIFEST}", and all required attributes are valid.`,
  TWO_STEP: `The "${WEIGHING}" event was captured in two steps, and all required attributes are valid.`,
} as const;

export const INVALID_RESULT_COMMENTS = {
  CONTAINER_CAPACITY_FORMAT: `The "${CONTAINER_CAPACITY}" format must be one of the supported formats: ${supportedFormats}.`,
  CONTAINER_QUANTITY: `The "${CONTAINER_QUANTITY}" must not be declared when the "${VEHICLE_TYPE}" is "${TRUCK}".`,
  GROSS_WEIGHT_FORMAT: `The "${GROSS_WEIGHT}" format must be one of the supported formats: ${supportedFormats}.`,
  MASS_NET_WEIGHT_FORMAT: `The "${MASS_NET_WEIGHT}" format must be one of the supported formats: ${supportedFormats}.`,
  NET_WEIGHT_CALCULATION: ({
    calculatedNetWeight,
    containerQuantity,
    grossWeight,
    massNetWeight,
    tare,
  }: {
    calculatedNetWeight: number;
    containerQuantity: number;
    grossWeight: number;
    massNetWeight: number;
    tare: number;
  }) =>
    `The calculated net weight (${calculatedNetWeight}) differs from the declared "${MASS_NET_WEIGHT}" (${massNetWeight}) by more than ${NET_WEIGHT_CALCULATION_TOLERANCE}kg:  ${grossWeight} - (${tare} × ${containerQuantity}) ≈ ${calculatedNetWeight} [formula: gross_weight - (tare * container_quantity)]`,
  SCALE_TYPE: (scaleType: unknown) =>
    `The "${SCALE_TYPE}" "${String(scaleType)}" is not supported by the methodology.`,
  SCALE_TYPE_MISMATCH: (scaleType: unknown, homologationScaleType: unknown) =>
    `The provided "${SCALE_TYPE}" "${String(scaleType)}" does not match the homologation scale type "${String(homologationScaleType)}".`,
  TARE_FORMAT: `The "${TARE}" format must be one of the supported formats.`,
  TWO_STEP_CONTAINER_TYPE: (containerType: unknown) =>
    `The "${CONTAINER_TYPE}" for two-step weighing must be ${DocumentEventContainerType.TRUCK}, but "${String(containerType)}" was provided.`,
  TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS:
    'The first weighing participant does not match the second weighing participant.',
  TWO_STEP_WEIGHING_EVENT_SCALE_TYPE: (scaleType: unknown) =>
    `The "${SCALE_TYPE}" for two-step weighing must be "${DocumentEventScaleType.WEIGHBRIDGE}", but "${String(scaleType)}" was provided.`,
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
  VEHICLE_LICENSE_PLATE_FORMAT: `The "${VEHICLE_LICENSE_PLATE}" format is invalid.`,
  VEHICLE_LICENSE_PLATE_SENSITIVE: `The "${VEHICLE_LICENSE_PLATE}" attribute should be marked as sensitive.`,
  WEIGHING_CAPTURE_METHOD: (captureMethod: unknown) =>
    `The "${WEIGHING_CAPTURE_METHOD}" "${String(captureMethod)}" is not supported by the methodology.`,
} as const;

export const MISSING_RESULT_COMMENTS = {
  CONTAINER_CAPACITY: `The "${CONTAINER_CAPACITY}" must be greater than 0.`,
  CONTAINER_QUANTITY: `The "${CONTAINER_QUANTITY}" must be greater than 0 unless the "${VEHICLE_TYPE}" is "${TRUCK}".`,
  CONTAINER_TYPE: `The "${CONTAINER_TYPE}" must be provided.`,
  DESCRIPTION: `The "${WEIGHING}" event must have a "${DESCRIPTION}", but none was provided.`,
  GROSS_WEIGHT: (grossWeight: unknown) =>
    `The "${GROSS_WEIGHT}" must be provided and greater than 0. Received "${String(grossWeight)}"`,
  MASS_NET_WEIGHT: (massNetWeight: unknown) =>
    `The "${MASS_NET_WEIGHT}" must be provided and greater than 0. Received "${String(massNetWeight)}"`,
  TARE: (tare: unknown) =>
    `The "${TARE}" must be provided and greater than 0. Received "${String(tare)}"`,
} as const;

export const NOT_FOUND_RESULT_COMMENTS = {
  HOMOLOGATION_EVENT: `The referenced "${SCALE_HOMOLOGATION}" event was not found.`,
  MORE_THAN_TWO_WEIGHING_EVENTS: `More than two "${WEIGHING}" events were found, which is not supported.`,
  NO_WEIGHING_EVENTS: `No "${WEIGHING}" events were found in the document.`,
} as const;
