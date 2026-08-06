import {
  BoldActorType,
  BoldAttributeName,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

const {
  CONTAINER_TYPE,
  DEDUCTED_WEIGHT,
  DESCRIPTION,
  DOCUMENT_NUMBER,
  DOCUMENT_TYPE,
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  EXEMPTION_JUSTIFICATION,
  GROSS_WEIGHT,
  ISSUE_DATE,
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  RECEIVING_OPERATOR_IDENTIFIER,
  SCALE_TYPE,
  TARE,
  VEHICLE_LICENSE_PLATE,
  VEHICLE_TYPE,
  WEIGHING_CAPTURE_METHOD,
} = BoldAttributeName;

const {
  ACTOR,
  DROP_OFF,
  PICK_UP,
  RECYCLED,
  RECYCLING_MANIFEST,
  SORTING,
  TRANSPORT_MANIFEST,
  WEIGHING,
} = BoldDocumentEventName;

const { INTEGRATOR, PROCESSOR, RECYCLER } = BoldActorType;

const METHODOLOGY_PLATFORM_LABEL = 'METHODOLOGY PLATFORM';

export interface AttributePrivacySpec {
  isPublic: boolean;
  sensitive: boolean;
}

export interface EventPrivacySpec {
  attributes: ReadonlyMap<string, AttributePrivacySpec>;
  isPublic: boolean;
}

const PUBLIC: AttributePrivacySpec = { isPublic: true, sensitive: false };
const PUBLIC_MASKED: AttributePrivacySpec = { isPublic: true, sensitive: true };

const publicEvent = (
  attributes: ReadonlyArray<readonly [BoldAttributeName, AttributePrivacySpec]>,
): EventPrivacySpec => ({ attributes: new Map(attributes), isPublic: true });

export const EVENT_PRIVACY_SPEC: ReadonlyMap<string, EventPrivacySpec> =
  new Map<BoldDocumentEventName, EventPrivacySpec>([
    [
      DROP_OFF,
      publicEvent([
        [DESCRIPTION, PUBLIC],
        [RECEIVING_OPERATOR_IDENTIFIER, PUBLIC],
      ]),
    ],
    [
      PICK_UP,
      publicEvent([
        [DESCRIPTION, PUBLIC],
        [DRIVER_IDENTIFIER, PUBLIC_MASKED],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, PUBLIC],
        [LOCAL_WASTE_CLASSIFICATION_DESCRIPTION, PUBLIC],
        [LOCAL_WASTE_CLASSIFICATION_ID, PUBLIC],
        [VEHICLE_LICENSE_PLATE, PUBLIC_MASKED],
        [VEHICLE_TYPE, PUBLIC],
      ]),
    ],
    [RECYCLED, publicEvent([[DESCRIPTION, PUBLIC]])],
    [
      RECYCLING_MANIFEST,
      publicEvent([
        [DOCUMENT_NUMBER, PUBLIC],
        [DOCUMENT_TYPE, PUBLIC],
        [ISSUE_DATE, PUBLIC],
      ]),
    ],
    [
      SORTING,
      publicEvent([
        [DEDUCTED_WEIGHT, PUBLIC],
        [DESCRIPTION, PUBLIC],
        [GROSS_WEIGHT, PUBLIC],
      ]),
    ],
    [
      TRANSPORT_MANIFEST,
      publicEvent([
        [DOCUMENT_NUMBER, PUBLIC],
        [DOCUMENT_TYPE, PUBLIC],
        [EXEMPTION_JUSTIFICATION, PUBLIC],
        [ISSUE_DATE, PUBLIC],
      ]),
    ],
    [
      WEIGHING,
      publicEvent([
        [CONTAINER_TYPE, PUBLIC],
        [DESCRIPTION, PUBLIC],
        [GROSS_WEIGHT, PUBLIC],
        [SCALE_TYPE, PUBLIC],
        [TARE, PUBLIC],
        [VEHICLE_LICENSE_PLATE, PUBLIC_MASKED],
        [WEIGHING_CAPTURE_METHOD, PUBLIC],
      ]),
    ],
  ]);

export const OPEN_ACTOR_LABELS: ReadonlySet<string> = new Set([
  PROCESSOR,
  RECYCLER,
]);

export const SKIPPED_ACTOR_LABELS: ReadonlySet<string> = new Set([
  INTEGRATOR,
  METHODOLOGY_PLATFORM_LABEL,
]);

export const SKIPPED_EVENT_NAMES: ReadonlySet<string> = new Set([
  'GasID',
  'MassID Audit (BOLD Carbon)',
  'MassID Audit (BOLD Recycling)',
  'RecycledID',
]);

export const PRIVACY_REASON_CODES = {
  ACTOR_PRESERVE_SENSITIVE_DATA: 'PRIVACY_ACTOR_PRESERVE_SENSITIVE_DATA',
  ATTRIBUTE_IS_PUBLIC: 'PRIVACY_ATTRIBUTE_IS_PUBLIC_MISMATCH',
  ATTRIBUTE_SENSITIVE: 'PRIVACY_ATTRIBUTE_SENSITIVE_MISMATCH',
  EVENT_IS_PUBLIC: 'PRIVACY_EVENT_IS_PUBLIC_MISMATCH',
} as const;

export const RESULT_COMMENTS = {
  passed: {
    ALL_FLAGS_MATCH: (validatedEvents: number) =>
      `All privacy flags match the methodology specification across ${String(validatedEvents)} validated event(s).`,
  },
  reviewRequired: {
    ACTOR_IS_PUBLIC: (label: string, expected: boolean) =>
      `The "${ACTOR}" event labeled "${label}" must declare "isPublic" as ${String(expected)}.`,
    ACTOR_PRESERVE_SENSITIVE_DATA: (label: string) =>
      `The "${ACTOR}" event labeled "${label}" must not declare "preserveSensitiveData" as true, because the methodology requires this participant to be publicly identifiable.`,
    ATTRIBUTE_IS_PUBLIC: (
      eventName: string,
      attributeName: string,
      expected: boolean,
    ) =>
      `The "${attributeName}" attribute of the "${eventName}" event must declare "isPublic" as ${String(expected)}.`,
    ATTRIBUTE_SENSITIVE: (
      eventName: string,
      attributeName: string,
      expected: boolean,
    ) =>
      `The "${attributeName}" attribute of the "${eventName}" event must declare "sensitive" as ${String(expected)}.`,
    EVENT_IS_PUBLIC: (eventName: string, expected: boolean) =>
      `The "${eventName}" event must declare "isPublic" as ${String(expected)}.`,
  },
} as const;
