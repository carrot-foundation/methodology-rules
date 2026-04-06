import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  BoldStubsBuilder,
  type MetadataAttributeParameter,
  stubBoldAccreditationResultEvent,
  type StubBoldDocumentParameters,
  stubBoldMassIDWeighingEvent,
  stubBoldMonitoringSystemsAndEquipmentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldApprovedExceptionType,
  BoldAttributeName,
  BoldContainerType,
  type BoldDocument,
  BoldDocumentCategory,
  type BoldDocumentEvent,
  BoldDocumentEventName,
  BoldScaleType,
  BoldWeighingCaptureMethod,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  ApprovedException,
  DocumentEventAttributeFormat,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import {
  INVALID_RESULT_COMMENTS,
  NOT_FOUND_RESULT_COMMENTS,
  PASSED_RESULT_COMMENTS,
  WRONG_FORMAT_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';

const { ACCREDITATION_RESULT, MONITORING_SYSTEMS_AND_EQUIPMENT, WEIGHING } =
  BoldDocumentEventName;
const {
  APPROVED_EXCEPTIONS,
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DESCRIPTION,
  GROSS_WEIGHT,
  REQUIRED_ADDITIONAL_VERIFICATIONS,
  SCALE_TYPE,
  TARE,
  VEHICLE_LICENSE_PLATE,
  WEIGHING_CAPTURE_METHOD,
} = BoldAttributeName;
const { RECYCLER } = MassIDActorType;
const { KILOGRAM } = DocumentEventAttributeFormat;

const scaleType = stubEnumValue(BoldScaleType);
const twoStepScaleType = BoldScaleType.WEIGHBRIDGE;
const scaleTypeMismatch = faker.string.sample();
const weighingCaptureMethodMismatch = faker.string.sample();
const twoStepWeighingEventParticipant = stubParticipant();

// Deterministic values for manifestExample test cases
const MANIFEST_SCALE_TYPE = BoldScaleType.FLOOR_SCALE;
const MANIFEST_TWO_STEP_PARTICIPANT = stubParticipant({
  id: '550e8400-e29b-41d4-a716-446655440001',
});

const stubBaseAccreditationDocuments = ({
  scaleTypeValue = scaleType,
  tareExceptionValidUntil,
  withContainerCapacityException = false,
  withContainerQuantityException = false,
  withScaleTicketVerification = false,
  withTareException = false,
}: {
  scaleTypeValue?: BoldScaleType;
  tareExceptionValidUntil?: string;
  withContainerCapacityException?: boolean;
  withContainerQuantityException?: boolean;
  withScaleTicketVerification?: boolean;
  withTareException?: boolean;
} = {}) => {
  const exceptions = [];
  const additionalVerifications = [];

  if (withContainerCapacityException) {
    exceptions.push({
      'Attribute Location': {
        Asset: {
          Category: BoldDocumentCategory.MASS_ID,
        },
        Event: WEIGHING,
      },
      'Attribute Name': CONTAINER_CAPACITY,
      'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
      Reason: 'The container capacity is not required for this event',
    });
  }

  if (withContainerQuantityException) {
    exceptions.push({
      'Attribute Location': {
        Asset: {
          Category: BoldDocumentCategory.MASS_ID,
        },
        Event: WEIGHING,
      },
      'Attribute Name': CONTAINER_QUANTITY,
      'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
      Reason: 'The container quantity is not required for this event',
    });
  }

  if (withTareException) {
    const tareException: ApprovedException = {
      'Attribute Location': {
        Asset: {
          Category: BoldDocumentCategory.MASS_ID,
        },
        Event: WEIGHING,
      },
      'Attribute Name': TARE,
      'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
      Reason:
        'Legacy manual weighing system only captured net weight for TRUCK containers',
    };

    if (tareExceptionValidUntil) {
      tareException['Valid Until'] = tareExceptionValidUntil;
    }

    exceptions.push(tareException);
  }

  if (withScaleTicketVerification) {
    additionalVerifications.push({
      'Layout IDs': ['layout-1'],
      'Verification Type': 'Scale Ticket',
    });
  }

  return new Map([
    [
      RECYCLER,
      {
        externalEventsMap: {
          [ACCREDITATION_RESULT]: stubBoldAccreditationResultEvent({
            metadataAttributes: [
              ...(exceptions.length > 0
                ? ([
                    [APPROVED_EXCEPTIONS, exceptions],
                  ] as MetadataAttributeParameter[])
                : []),
              ...(additionalVerifications.length > 0
                ? ([
                    [
                      REQUIRED_ADDITIONAL_VERIFICATIONS,
                      additionalVerifications,
                    ],
                  ] as MetadataAttributeParameter[])
                : []),
            ],
          }),
          [MONITORING_SYSTEMS_AND_EQUIPMENT]:
            stubBoldMonitoringSystemsAndEquipmentEvent({
              metadataAttributes: [[SCALE_TYPE, scaleTypeValue]],
            }),
        },
      },
    ],
  ]);
};

const eventValue = 99;

const createWeighingEvent = (
  overrideAttributes: MetadataAttributeParameter[] = [],
  eventValueOverride: number = eventValue,
  participant?: ReturnType<typeof stubParticipant>,
): BoldDocumentEvent =>
  stubBoldMassIDWeighingEvent({
    metadataAttributes: overrideAttributes,
    partialDocumentEvent: {
      ...(participant && { participant }),
      value: eventValueOverride,
    },
  });

const mergeAttributes = (
  base: MetadataAttributeParameter[],
  overrides: MetadataAttributeParameter[],
): MetadataAttributeParameter[] => {
  const result = [...base];

  for (const override of overrides) {
    const [overrideName] = Array.isArray(override) ? override : [override.name];
    const existingIndex = result.findIndex((attribute) => {
      const [attributeName] = Array.isArray(attribute)
        ? attribute
        : [attribute.name];

      return attributeName === overrideName;
    });

    if (existingIndex === -1) {
      result.push(override);
    } else {
      result.splice(existingIndex, 1, override);
    }
  }

  return result;
};

const validWeighingAttributes: MetadataAttributeParameter[] = [
  [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
  [SCALE_TYPE, scaleType],
  [CONTAINER_QUANTITY, 1],
  { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
  { format: KILOGRAM, name: TARE, value: 1 },
];

const manifestWeighingAttributes: MetadataAttributeParameter[] = [
  [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
  [SCALE_TYPE, MANIFEST_SCALE_TYPE],
  [CONTAINER_QUANTITY, 1],
  { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
  { format: KILOGRAM, name: TARE, value: 1 },
];

const validWeighingAttributesWithoutQuantity: MetadataAttributeParameter[] = [
  [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
  [SCALE_TYPE, scaleType],
  [CONTAINER_QUANTITY, undefined],
  { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
  { format: KILOGRAM, name: TARE, value: 1 },
];

const createTwoStepWeighingEvents = (
  scaleTypeValue: BoldScaleType,
  participant: ReturnType<typeof stubParticipant>,
  firstEventOverrides: MetadataAttributeParameter[] = [],
  secondEventOverrides: MetadataAttributeParameter[] = firstEventOverrides,
) => ({
  [`${WEIGHING}-2`]: createWeighingEvent(
    mergeAttributes(validWeighingAttributesWithoutQuantity, [
      [SCALE_TYPE, scaleTypeValue],
      [CONTAINER_TYPE, BoldContainerType.TRUCK],
      ...firstEventOverrides,
    ]),
    eventValue,
    participant,
  ),
  [WEIGHING]: createWeighingEvent(
    mergeAttributes(validWeighingAttributesWithoutQuantity, [
      [SCALE_TYPE, scaleTypeValue],
      [CONTAINER_TYPE, BoldContainerType.TRUCK],
      ...secondEventOverrides,
    ]),
    eventValue,
    participant,
  ),
});

interface WeighingTestCase extends RuleTestCase {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIDDocumentEvents: Record<string, BoldDocumentEvent | undefined>;
  scaleTicketVerificationError?: string;
}

const processorErrors = new WeighingProcessorErrors();

export const weighingTestCases: WeighingTestCase[] = [
  {
    massIDDocumentEvents: {
      [WEIGHING]: undefined,
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.NO_WEIGHING_EVENTS,
    resultStatus: 'FAILED',
    scenario: `The MassID document does not have "${WEIGHING}" events`,
  },
  {
    massIDDocumentEvents: {
      [`${WEIGHING}-1`]: stubBoldMassIDWeighingEvent(),
      [`${WEIGHING}-2`]: stubBoldMassIDWeighingEvent(),
      [`${WEIGHING}-3`]: stubBoldMassIDWeighingEvent(),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.MORE_THAN_TWO_WEIGHING_EVENTS,
    resultStatus: 'FAILED',
    scenario: `The MassID document has more than two "${WEIGHING}" events`,
  },
  {
    accreditationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [MONITORING_SYSTEMS_AND_EQUIPMENT]: undefined,
          },
        },
      ],
    ]),
    massIDDocumentEvents: {
      [WEIGHING]: stubBoldMassIDWeighingEvent({
        metadataAttributes: validWeighingAttributes,
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT,
    resultStatus: 'FAILED',
    scenario: `The Recycler Accreditation document does not have a "${SCALE_TYPE}" attribute`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_CAPACITY, undefined],
        ]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_CAPACITY} ${INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "${CONTAINER_CAPACITY}" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_TYPE, BoldContainerType.BAG],
          [CONTAINER_QUANTITY, undefined],
        ]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: 'FAILED',
    scenario: `The "${CONTAINER_QUANTITY}" attribute is missing and the "${CONTAINER_TYPE}" is "${BoldContainerType.BAG}"`,
  },
  {
    accreditationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [ACCREDITATION_RESULT]: undefined,
          },
        },
      ],
    ]),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_TYPE, BoldContainerType.BAG],
        ]),
      ),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT,
    resultStatus: 'FAILED',
    scenario: `The "${ACCREDITATION_RESULT}" event is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_QUANTITY, 1],
          [CONTAINER_TYPE, BoldContainerType.TRUCK],
        ]),
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: 'FAILED',
    scenario: `The "${CONTAINER_QUANTITY}" attribute is defined, but the "${CONTAINER_TYPE}" is "${BoldContainerType.TRUCK}"`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[GROSS_WEIGHT, undefined]]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.GROSS_WEIGHT(undefined as unknown)} ${INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "${GROSS_WEIGHT}" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes, 0),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.EVENT_VALUE(0),
    resultStatus: 'FAILED',
    scenario: 'The event value field is missing',
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[TARE, undefined]]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE(undefined as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "${TARE}" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[DESCRIPTION, undefined]]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: 'FAILED',
    scenario: `The "${DESCRIPTION}" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[DESCRIPTION, '']]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: 'FAILED',
    scenario: `The "${DESCRIPTION}" attribute is an empty string`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
          [SCALE_TYPE, scaleTypeMismatch],
        ]),
      ),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.SCALE_TYPE_MISMATCH(
      scaleTypeMismatch,
      scaleType,
    )} ${INVALID_RESULT_COMMENTS.SCALE_TYPE(scaleTypeMismatch)}`,
    resultStatus: 'FAILED',
    scenario: `The "${SCALE_TYPE}" attribute is not equal to the "${SCALE_TYPE}" attribute in the Recycler Accreditation document and is not supported by the methodology`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: BoldScaleType.WEIGHBRIDGE,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [SCALE_TYPE, BoldScaleType.WEIGHBRIDGE_SHORT],
        ]),
      ),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The "${SCALE_TYPE}" "${BoldScaleType.WEIGHBRIDGE_SHORT}" matches accreditation "${BoldScaleType.WEIGHBRIDGE}" as equivalent`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [WEIGHING_CAPTURE_METHOD, weighingCaptureMethodMismatch],
          [SCALE_TYPE, scaleType],
        ]),
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.WEIGHING_CAPTURE_METHOD(
      weighingCaptureMethodMismatch,
    ),
    resultStatus: 'FAILED',
    scenario: `The "${WEIGHING_CAPTURE_METHOD}" attribute is not supported by the methodology`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [VEHICLE_LICENSE_PLATE, undefined],
        ]),
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT,
    resultStatus: 'FAILED',
    scenario: `The "${VEHICLE_LICENSE_PLATE}" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[CONTAINER_TYPE, undefined]]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_TYPE,
    resultStatus: 'FAILED',
    scenario: `The "${CONTAINER_TYPE}" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: MANIFEST_SCALE_TYPE,
    }),
    manifestExample: true,
    manifestFields: { includeValue: true },
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(manifestWeighingAttributes),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The one step "${WEIGHING}" event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withScaleTicketVerification: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_SCALE_TICKET_VALIDATION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The one step "${WEIGHING}" event is valid with scale ticket verification configured`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withScaleTicketVerification: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes),
    },
    resultComment: 'Scale ticket mismatch',
    resultStatus: 'FAILED',
    scaleTicketVerificationError: 'Scale ticket mismatch',
    scenario: `Scale ticket verification fails for "${WEIGHING}" event`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withContainerCapacityException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_CAPACITY, undefined],
        ]),
      ),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The one step "${WEIGHING}" event is valid with container capacity exception`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withContainerQuantityException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_TYPE, BoldContainerType.BAG],
          [CONTAINER_QUANTITY, undefined],
        ]),
      ),
    },
    resultComment:
      PASSED_RESULT_COMMENTS.PASSED_WITH_CONTAINER_QUANTITY_EXCEPTION(
        PASSED_RESULT_COMMENTS.SINGLE_STEP,
      ),
    resultStatus: 'PASSED',
    scenario: `The one step "${WEIGHING}" event is valid with container quantity exception for non-TRUCK container`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIDDocumentEvents: {
      [`${WEIGHING}-2`]: createWeighingEvent(
        mergeAttributes(validWeighingAttributesWithoutQuantity, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, BoldContainerType.TRUCK],
        ]),
        eventValue,
        stubParticipant(),
      ),
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributesWithoutQuantity, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, BoldContainerType.TRUCK],
        ]),
        eventValue,
        stubParticipant(),
      ),
    },
    resultComment:
      INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS,
    resultStatus: 'FAILED',
    scenario: `The two step "${WEIGHING}" event participant ids do not match`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
      withContainerCapacityException: true,
    }),
    massIDDocumentEvents: createTwoStepWeighingEvents(
      twoStepScaleType,
      twoStepWeighingEventParticipant,
      [[CONTAINER_CAPACITY, undefined]],
    ),
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_EXCEPTION(
      PASSED_RESULT_COMMENTS.TWO_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The two step "${WEIGHING}" events are valid with container capacity exception`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    manifestExample: true,
    manifestFields: { includeValue: true },
    massIDDocumentEvents: createTwoStepWeighingEvents(
      twoStepScaleType,
      MANIFEST_TWO_STEP_PARTICIPANT,
    ),
    resultComment: PASSED_RESULT_COMMENTS.TWO_STEP,
    resultStatus: 'PASSED',
    scenario: `The two step "${WEIGHING}" events are valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIDDocumentEvents: createTwoStepWeighingEvents(
      twoStepScaleType,
      twoStepWeighingEventParticipant,
      [],
      [{ format: KILOGRAM, name: CONTAINER_CAPACITY, value: 2 }],
    ),
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_VALUES({
      attributeName: CONTAINER_CAPACITY,
      firstValue: 2,
      secondValue: 1,
    }),
    resultStatus: 'FAILED',
    scenario: `The two step "${WEIGHING}" event "${CONTAINER_CAPACITY}" attribute values do not match`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: BoldScaleType.CONVEYOR_BELT_SCALE,
    }),
    massIDDocumentEvents: createTwoStepWeighingEvents(
      BoldScaleType.CONVEYOR_BELT_SCALE,
      twoStepWeighingEventParticipant,
    ),
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(
      BoldScaleType.CONVEYOR_BELT_SCALE,
    ),
    resultStatus: 'FAILED',
    scenario: `The two step "${WEIGHING}" event scale type is not "${BoldScaleType.WEIGHBRIDGE_SHORT}"`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIDDocumentEvents: {
      [`${WEIGHING}-2`]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, BoldContainerType.BAG],
        ]),
        eventValue,
        twoStepWeighingEventParticipant,
      ),
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, BoldContainerType.BAG],
        ]),
        eventValue,
        twoStepWeighingEventParticipant,
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(
      BoldContainerType.BAG,
    ),
    resultStatus: 'FAILED',
    scenario: `The two step "${WEIGHING}" event container type is not "${BoldContainerType.TRUCK}"`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: scaleType,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [
            WEIGHING_CAPTURE_METHOD,
            BoldWeighingCaptureMethod.TRANSPORT_MANIFEST,
          ],
          [SCALE_TYPE, scaleType],
        ]),
      ),
    },
    resultComment: PASSED_RESULT_COMMENTS.TRANSPORT_MANIFEST,
    resultStatus: 'PASSED',
    scenario: `The "${WEIGHING_CAPTURE_METHOD}" attribute is "${BoldWeighingCaptureMethod.TRANSPORT_MANIFEST}" and the "${WEIGHING}" event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: MANIFEST_SCALE_TYPE,
    }),
    manifestExample: true,
    manifestFields: { includeValue: true },
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(manifestWeighingAttributes, 98),
    },
    resultComment: INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
      calculatedNetWeight: 99,
      containerQuantity: 1,
      eventValue: 98,
      grossWeight: 100,
      tare: 1,
    }),
    resultStatus: 'FAILED',
    scenario: 'The calculated net weight is not equal to the mass net weight',
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The "${WEIGHING}" event is valid for TRUCK container with tare exception and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined' as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "${WEIGHING}" event fails for TRUCK container without tare exception and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.BIN],
        [CONTAINER_QUANTITY, 1],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The "${WEIGHING}" event is valid for non-TRUCK (BIN) container with tare exception and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        [
          [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
          [SCALE_TYPE, scaleType],
          [CONTAINER_TYPE, BoldContainerType.BIN],
          [CONTAINER_QUANTITY, 1],
          { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
          { format: KILOGRAM, name: TARE, value: 1 },
        ],
        98,
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
      calculatedNetWeight: 99,
      containerQuantity: 1,
      eventValue: 98,
      grossWeight: 100,
      tare: 1,
    }),
    resultStatus: 'FAILED',
    scenario: `The "${WEIGHING}" event fails for non-TRUCK (BIN) container with tare exception when net weight calculation fails`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        { format: KILOGRAM, name: TARE, value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The "${WEIGHING}" event is valid for TRUCK container with tare exception and Tare provided`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        [GROSS_WEIGHT, undefined],
        { format: KILOGRAM, name: TARE, value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The "${WEIGHING}" event is valid for TRUCK container with tare exception and missing Gross Weight`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        [GROSS_WEIGHT, undefined],
        [TARE, undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The "${WEIGHING}" event is valid for TRUCK container with tare exception and both Tare and Gross Weight missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      tareExceptionValidUntil: '2020-01-01T00:00:00Z',
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined')} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "${WEIGHING}" event fails for TRUCK container with expired tare exception (Valid Until in past) and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      tareExceptionValidUntil: 'invalid-date-format',
      withTareException: true,
    }),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined')} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "${WEIGHING}" event fails for TRUCK container with invalid tare exception Valid Until date format and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, BoldWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, BoldContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        { format: KILOGRAM, name: TARE, value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The "${WEIGHING}" event is valid for TRUCK container without tare exception and both Tare and Gross Weight provided`,
  },
];

const {
  massIDAuditDocument,
  massIDDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIDDocuments()
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

interface WeighingErrorTestCase extends RuleTestCase {
  documents: BoldDocument[];
  massIDAuditDocument: BoldDocument;
}

export const weighingErrorTestCases: WeighingErrorTestCase[] = [
  {
    documents: [...participantsAccreditationDocuments.values()],
    massIDAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: 'FAILED',
    scenario: `The MassID document was not found`,
  },
  {
    documents: [massIDDocument],
    massIDAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    resultStatus: 'FAILED',
    scenario: `The Recycler accreditation document was not found`,
  },
];
