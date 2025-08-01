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
  DocumentEventAttributeName,
  DocumentEventContainerType,
  DocumentEventName,
  DocumentEventScaleType,
  DocumentEventWeighingCaptureMethod,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
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
  withContainerCapacityException = false,
}: {
  scaleTypeValue?: DocumentEventScaleType;
  withContainerCapacityException?: boolean;
} = {}) =>
  new Map([
    [
      RECYCLER,
      {
        externalEventsMap: {
          [ACCREDITATION_RESULT]: stubBoldAccreditationResultEvent({
            metadataAttributes: withContainerCapacityException
              ? [
                  [
                    APPROVED_EXCEPTIONS,
                    [
                      {
                        'Attribute Location': {
                          Asset: {
                            Category: DocumentCategory.MASS_ID,
                          },
                          Event: WEIGHING,
                        },
                        'Attribute Name': CONTAINER_CAPACITY,
                        'Exception Type':
                          MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
                        Reason:
                          'The container capacity is not required for this event',
                      },
                    ],
                  ],
                ]
              : [],
          }),
          [MONITORING_SYSTEMS_AND_EQUIPMENT]:
            stubBoldMonitoringSystemsAndEquipmentEvent({
              metadataAttributes: [[SCALE_TYPE, scaleTypeValue]],
            }),
        },
      },
    ],
  ]);

const eventValue = 99;
const validWeighingAttributes: MetadataAttributeParameter[] = [
  [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
  [SCALE_TYPE, scaleType],
  [CONTAINER_QUANTITY, 1],
  {
    format: KILOGRAM,
    name: GROSS_WEIGHT,
    value: 100,
  },
  {
    format: KILOGRAM,
    name: TARE,
    value: 1,
  },
];

const validWeighingAttributesWithoutQuantity: MetadataAttributeParameter[] = [
  [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
  [SCALE_TYPE, scaleType],
  [CONTAINER_QUANTITY, undefined],
  {
    format: KILOGRAM,
    name: GROSS_WEIGHT,
    value: 100,
  },
  {
    format: KILOGRAM,
    name: TARE,
    value: 1,
  },
];

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
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_CAPACITY, undefined],
          ...validWeighingAttributes,
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_CAPACITY} ${INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${CONTAINER_CAPACITY} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
          ...validWeighingAttributes,
          [CONTAINER_QUANTITY, undefined],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
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
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
          ...validWeighingAttributes,
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${ACCREDITATION_RESULT} event is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_QUANTITY, 1],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
          ...validWeighingAttributes,
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${CONTAINER_QUANTITY} attribute is defined, but the ${CONTAINER_TYPE} is ${DocumentEventContainerType.TRUCK}`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [GROSS_WEIGHT, undefined],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.GROSS_WEIGHT(undefined as unknown)} ${INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${GROSS_WEIGHT} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: validWeighingAttributes,
        partialDocumentEvent: {
          value: 0,
        },
      }),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.EVENT_VALUE(0),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the event value field is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [...validWeighingAttributes, [TARE, undefined]],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE(undefined as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${TARE} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [DESCRIPTION, undefined],
          ...validWeighingAttributes,
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${DESCRIPTION} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [[DESCRIPTION, ''], ...validWeighingAttributes],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${DESCRIPTION} attribute is an empty string`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
          ...validWeighingAttributes,
          [SCALE_TYPE, scaleTypeMismatch],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
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
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [WEIGHING_CAPTURE_METHOD, weighingCaptureMethodMismatch],
          [SCALE_TYPE, scaleType],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
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
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [VEHICLE_LICENSE_PLATE, undefined],
          ...validWeighingAttributes,
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT} ${INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_SENSITIVE}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${VEHICLE_LICENSE_PLATE} attribute is missing and is not sensitive`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_TYPE, undefined],
          ...validWeighingAttributes,
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_TYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${CONTAINER_TYPE} attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: validWeighingAttributes,
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the one step ${WEIGHING} event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withContainerCapacityException: true,
    }),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [CONTAINER_CAPACITY, undefined],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
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
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
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
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
          [CONTAINER_CAPACITY, undefined],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
          [CONTAINER_CAPACITY, undefined],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
    },
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
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
    },
    resultComment: PASSED_RESULT_COMMENTS.TWO_STEP,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the two step ${WEIGHING} events are valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
          {
            format: KILOGRAM,
            name: CONTAINER_CAPACITY,
            value: 2,
          },
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
    },
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
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, DocumentEventScaleType.CONVEYOR_BELT_SCALE],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributesWithoutQuantity,
          [SCALE_TYPE, DocumentEventScaleType.CONVEYOR_BELT_SCALE],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
    },
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
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
          value: eventValue,
        },
      }),
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
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [
            WEIGHING_CAPTURE_METHOD,
            DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST,
          ],
          [SCALE_TYPE, scaleType],
        ],
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: PASSED_RESULT_COMMENTS.TRANSPORT_MANIFEST,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the ${WEIGHING_CAPTURE_METHOD} attribute is ${DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST} and the ${WEIGHING} event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: validWeighingAttributes,
        partialDocumentEvent: {
          value: 98,
        },
      }),
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
