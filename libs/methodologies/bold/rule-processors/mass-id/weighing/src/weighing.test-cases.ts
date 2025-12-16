import {
  BoldStubsBuilder,
  type MetadataAttributeParameter,
  stubBoldAccreditationResultEvent,
  stubBoldMassIdWeighingEvent,
  stubBoldMonitoringSystemsAndEquipmentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventContainerType,
  DocumentEventName,
  DocumentEventScaleType,
  DocumentEventWeighingCaptureMethod,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  ApprovedException,
  MethodologyApprovedExceptionType,
  MethodologyDocumentEventAttributeFormat,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import {
  INVALID_RESULT_COMMENTS,
  NOT_FOUND_RESULT_COMMENTS,
  PASSED_RESULT_COMMENTS,
  WRONG_FORMAT_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';

const { ACCREDITATION_RESULT, MONITORING_SYSTEMS_AND_EQUIPMENT, WEIGHING } =
  DocumentEventName;
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
} = DocumentEventAttributeName;
const { RECYCLER } = MassIdDocumentActorType;
const { KILOGRAM } = MethodologyDocumentEventAttributeFormat;

const scaleType = random<DocumentEventScaleType>();
const twoStepScaleType = DocumentEventScaleType.WEIGHBRIDGE;
const scaleTypeMismatch = faker.string.sample();
const weighingCaptureMethodMismatch = faker.string.sample();
const twoStepWeighingEventParticipant = stubParticipant();

const stubBaseAccreditationDocuments = ({
  scaleTypeValue = scaleType,
  tareExceptionValidUntil,
  withContainerCapacityException = false,
  withScaleTicketVerification = false,
  withTareException = false,
}: {
  scaleTypeValue?: DocumentEventScaleType;
  tareExceptionValidUntil?: string;
  withContainerCapacityException?: boolean;
  withScaleTicketVerification?: boolean;
  withTareException?: boolean;
} = {}) => {
  const exceptions = [];
  const additionalVerifications = [];

  if (withContainerCapacityException) {
    exceptions.push({
      'Attribute Location': {
        Asset: {
          Category: DocumentCategory.MASS_ID,
        },
        Event: WEIGHING,
      },
      'Attribute Name': CONTAINER_CAPACITY,
      'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
      Reason: 'The container capacity is not required for this event',
    });
  }

  if (withTareException) {
    const tareException: ApprovedException = {
      'Attribute Location': {
        Asset: {
          Category: DocumentCategory.MASS_ID,
        },
        Event: WEIGHING,
      },
      'Attribute Name': TARE,
      'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
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
      scaleTicketLayout: 'layout1',
      verificationType: 'scaleTicket',
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
): DocumentEvent =>
  stubBoldMassIdWeighingEvent({
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
      result[existingIndex] = override;
    }
  }

  return result;
};

const validWeighingAttributes: MetadataAttributeParameter[] = [
  [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
  [SCALE_TYPE, scaleType],
  [CONTAINER_QUANTITY, 1],
  { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
  { format: KILOGRAM, name: TARE, value: 1 },
];

const validWeighingAttributesWithoutQuantity: MetadataAttributeParameter[] = [
  [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
  [SCALE_TYPE, scaleType],
  [CONTAINER_QUANTITY, undefined],
  { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
  { format: KILOGRAM, name: TARE, value: 1 },
];

const createTwoStepWeighingEvents = (
  scaleTypeValue: DocumentEventScaleType,
  participant: ReturnType<typeof stubParticipant>,
  firstEventOverrides: MetadataAttributeParameter[] = [],
  secondEventOverrides: MetadataAttributeParameter[] = firstEventOverrides,
) => ({
  [`${WEIGHING}-2`]: createWeighingEvent(
    mergeAttributes(validWeighingAttributesWithoutQuantity, [
      [SCALE_TYPE, scaleTypeValue],
      [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
      ...firstEventOverrides,
    ]),
    eventValue,
    participant,
  ),
  [WEIGHING]: createWeighingEvent(
    mergeAttributes(validWeighingAttributesWithoutQuantity, [
      [SCALE_TYPE, scaleTypeValue],
      [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
      ...secondEventOverrides,
    ]),
    eventValue,
    participant,
  ),
});

export const weighingTestCases = [
  {
    massIdDocumentEvents: {
      [WEIGHING]: undefined,
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.NO_WEIGHING_EVENTS,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the MassID document does not have ${WEIGHING} events`,
  },
  {
    massIdDocumentEvents: {
      [`${WEIGHING}-1`]: stubBoldMassIdWeighingEvent(),
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent(),
      [`${WEIGHING}-3`]: stubBoldMassIdWeighingEvent(),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.MORE_THAN_TWO_WEIGHING_EVENTS,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the MassID document has more than two ${WEIGHING} events`,
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
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: validWeighingAttributes,
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the Recycler Accreditation document does not have a ${SCALE_TYPE} attribute`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_CAPACITY, undefined],
        ]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_CAPACITY} ${INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${CONTAINER_CAPACITY} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
          [CONTAINER_QUANTITY, undefined],
        ]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${CONTAINER_QUANTITY} attribute is missing and the ${CONTAINER_TYPE} is ${DocumentEventContainerType.BAG}`,
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
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
        ]),
      ),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${ACCREDITATION_RESULT} event is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_QUANTITY, 1],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ]),
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${CONTAINER_QUANTITY} attribute is defined, but the ${CONTAINER_TYPE} is ${DocumentEventContainerType.TRUCK}`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[GROSS_WEIGHT, undefined]]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.GROSS_WEIGHT(undefined as unknown)} ${INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${GROSS_WEIGHT} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes, 0),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.EVENT_VALUE(0),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the event value field is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[TARE, undefined]]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE(undefined as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${TARE} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[DESCRIPTION, undefined]]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${DESCRIPTION} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[DESCRIPTION, '']]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${DESCRIPTION} attribute is an empty string`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
          [SCALE_TYPE, scaleTypeMismatch],
        ]),
      ),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.SCALE_TYPE_MISMATCH(
      scaleTypeMismatch,
      scaleType,
    )} ${INVALID_RESULT_COMMENTS.SCALE_TYPE(scaleTypeMismatch)}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${SCALE_TYPE} attribute is not equal to the ${SCALE_TYPE} attribute in the Recycler Accreditation document and is not supported by the methodology`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
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
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${WEIGHING_CAPTURE_METHOD} attribute is not supported by the methodology`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [VEHICLE_LICENSE_PLATE, undefined],
        ]),
      ),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT} ${INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_SENSITIVE}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${VEHICLE_LICENSE_PLATE} attribute is missing and is not sensitive`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [[CONTAINER_TYPE, undefined]]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_TYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${CONTAINER_TYPE} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the one step ${WEIGHING} event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withScaleTicketVerification: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes),
    },
    // The actual result comment will still be the standard single-step message
    // when the scale ticket verification passes.
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the one step ${WEIGHING} event is valid with scale ticket verification configured`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withScaleTicketVerification: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes),
    },
    resultComment: 'Scale ticket mismatch',
    resultStatus: RuleOutputStatus.FAILED,
    scaleTicketVerificationError: 'Scale ticket mismatch',
    scenario: `scale ticket verification fails for ${WEIGHING} event`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withContainerCapacityException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [CONTAINER_CAPACITY, undefined],
        ]),
      ),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the one step ${WEIGHING} event is valid with container capacity exception`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: createWeighingEvent(
        mergeAttributes(validWeighingAttributesWithoutQuantity, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ]),
        eventValue,
        stubParticipant(),
      ),
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributesWithoutQuantity, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ]),
        eventValue,
        stubParticipant(),
      ),
    },
    resultComment:
      INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the two step ${WEIGHING} event participant ids do not match`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
      withContainerCapacityException: true,
    }),
    massIdDocumentEvents: createTwoStepWeighingEvents(
      twoStepScaleType,
      twoStepWeighingEventParticipant,
      [[CONTAINER_CAPACITY, undefined]],
    ),
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_EXCEPTION(
      PASSED_RESULT_COMMENTS.TWO_STEP,
    ),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the two step ${WEIGHING} events are valid with container capacity exception`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIdDocumentEvents: createTwoStepWeighingEvents(
      twoStepScaleType,
      twoStepWeighingEventParticipant,
    ),
    resultComment: PASSED_RESULT_COMMENTS.TWO_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the two step ${WEIGHING} events are valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIdDocumentEvents: createTwoStepWeighingEvents(
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
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the two step ${WEIGHING} event ${CONTAINER_CAPACITY} attribute values do not match`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: DocumentEventScaleType.CONVEYOR_BELT_SCALE,
    }),
    massIdDocumentEvents: createTwoStepWeighingEvents(
      DocumentEventScaleType.CONVEYOR_BELT_SCALE,
      twoStepWeighingEventParticipant,
    ),
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(
      DocumentEventScaleType.CONVEYOR_BELT_SCALE,
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the two step ${WEIGHING} event scale type is not ${DocumentEventScaleType.WEIGHBRIDGE}`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
        ]),
        eventValue,
        twoStepWeighingEventParticipant,
      ),
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
        ]),
        eventValue,
        twoStepWeighingEventParticipant,
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(
      DocumentEventContainerType.BAG,
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the two step ${WEIGHING} event container type is not ${DocumentEventContainerType.TRUCK}`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: scaleType,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [
            WEIGHING_CAPTURE_METHOD,
            DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST,
          ],
          [SCALE_TYPE, scaleType],
        ]),
      ),
    },
    resultComment: PASSED_RESULT_COMMENTS.TRANSPORT_MANIFEST,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the ${WEIGHING_CAPTURE_METHOD} attribute is ${DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST} and the ${WEIGHING} event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(validWeighingAttributes, 98),
    },
    resultComment: INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
      calculatedNetWeight: 99,
      containerQuantity: 1,
      eventValue: 98,
      grossWeight: 100,
      tare: 1,
    }),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the calculated net weight is not equal to the mass net weight',
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the ${WEIGHING} event is valid for TRUCK container with tareException and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined' as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${WEIGHING} event fails for TRUCK container without tareException and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.BIN],
        [CONTAINER_QUANTITY, 1],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined')} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${WEIGHING} event fails for non-TRUCK (BIN) container with tareException and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent(
        [
          [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
          [SCALE_TYPE, scaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.BIN],
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
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${WEIGHING} event fails for non-TRUCK (BIN) container with tareException when net weight calculation fails (tare exception does not apply to non-TRUCK containers)`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        { format: KILOGRAM, name: TARE, value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the ${WEIGHING} event is valid for TRUCK container with tareException and Tare provided`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        [GROSS_WEIGHT, undefined],
        { format: KILOGRAM, name: TARE, value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the ${WEIGHING} event is valid for TRUCK container with tareException and missing Gross Weight`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        [GROSS_WEIGHT, undefined],
        [TARE, undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the ${WEIGHING} event is valid for TRUCK container with tareException and both Tare and Gross Weight missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      tareExceptionValidUntil: '2020-01-01T00:00:00Z',
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined')} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${WEIGHING} event fails for TRUCK container with expired tareException (Valid Until in past) and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      tareExceptionValidUntil: 'invalid-date-format',
      withTareException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        [TARE, undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined')} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${WEIGHING} event fails for TRUCK container with invalid tareException Valid Until date format and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: createWeighingEvent([
        [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
        [SCALE_TYPE, scaleType],
        [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        [CONTAINER_QUANTITY, undefined],
        { format: KILOGRAM, name: GROSS_WEIGHT, value: 100 },
        { format: KILOGRAM, name: TARE, value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the ${WEIGHING} event is valid for TRUCK container without tareException and both Tare and Gross Weight provided`,
  },
];

const processorErrors = new WeighingProcessorErrors();

const {
  massIdAuditDocument,
  massIdDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const weighingErrorTestCases = [
  {
    documents: [...participantsAccreditationDocuments.values()],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the MassID document was not found`,
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the Recycler accreditation document was not found`,
  },
];
