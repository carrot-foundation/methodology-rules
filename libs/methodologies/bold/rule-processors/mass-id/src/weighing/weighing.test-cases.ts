import {
  BoldStubsBuilder,
  type MetadataAttributeParameter,
  stubBoldHomologationDocumentCloseEvent,
  stubBoldMassIdWeighingEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventContainerType,
  DocumentEventName,
  DocumentEventScaleType,
  DocumentEventVehicleType,
  DocumentEventWeighingCaptureMethod,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import {
  APPROVED_RESULT_COMMENTS,
  INVALID_RESULT_COMMENTS,
  MISSING_RESULT_COMMENTS,
  NOT_FOUND_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';

const { CLOSE, WEIGHING } = DocumentEventName;
const {
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DESCRIPTION,
  GROSS_WEIGHT,
  MASS_NET_WEIGHT,
  SCALE_TYPE,
  TARE,
  VEHICLE_LICENSE_PLATE,
  VEHICLE_TYPE,
  WEIGHING_CAPTURE_METHOD,
} = DocumentEventAttributeName;
const { RECYCLER } = MassIdDocumentActorType;
const { CAR, TRUCK } = DocumentEventVehicleType;
const { KILOGRAM } = MethodologyDocumentEventAttributeFormat;

const scaleType = random<DocumentEventScaleType>();
const twoStepScaleType = DocumentEventScaleType.WEIGHBRIDGE;
const scaleTypeMismatch = faker.string.sample();
const weighingCaptureMethodMismatch = faker.string.sample();
const twoStepWeighingEventParticipant = stubParticipant();

const stubBaseHomologationDocuments = (
  scaleTypeValue: DocumentEventScaleType = scaleType,
) =>
  new Map([
    [
      RECYCLER,
      {
        externalEventsMap: {
          [CLOSE]: stubBoldHomologationDocumentCloseEvent({
            metadataAttributes: [[SCALE_TYPE, scaleTypeValue]],
          }),
        },
      },
    ],
  ]);

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
    name: MASS_NET_WEIGHT,
    value: 99,
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
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document does not have ${WEIGHING} events`,
  },
  {
    massIdDocumentEvents: {
      [`${WEIGHING}-1`]: stubBoldMassIdWeighingEvent(),
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent(),
      [`${WEIGHING}-3`]: stubBoldMassIdWeighingEvent(),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.MORE_THAN_TWO_WEIGHING_EVENTS,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has more than two ${WEIGHING} events`,
  },
  {
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [CLOSE]: undefined,
          },
        },
      ],
    ]),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [...validWeighingAttributes],
      }),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.HOMOLOGATION_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the Recycler Homologation document does not have a ${SCALE_TYPE} attribute`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_CAPACITY, undefined],
          ...validWeighingAttributes,
        ],
      }),
    },
    resultComment: `${MISSING_RESULT_COMMENTS.CONTAINER_CAPACITY} ${INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${CONTAINER_CAPACITY} attribute is missing`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [VEHICLE_TYPE, CAR],
          ...validWeighingAttributes,
          [CONTAINER_QUANTITY, undefined],
        ],
      }),
    },
    resultComment: MISSING_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${CONTAINER_QUANTITY} attribute is missing and the ${VEHICLE_TYPE} is ${TRUCK}`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_QUANTITY, 1],
          [VEHICLE_TYPE, TRUCK],
          ...validWeighingAttributes,
        ],
      }),
    },
    resultComment: INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${CONTAINER_QUANTITY} attribute is defined, but the ${VEHICLE_TYPE} is ${TRUCK}`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [GROSS_WEIGHT, undefined],
        ],
      }),
    },
    resultComment: `${MISSING_RESULT_COMMENTS.GROSS_WEIGHT(undefined as unknown)} ${INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${GROSS_WEIGHT} attribute is missing`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [MASS_NET_WEIGHT, undefined],
        ],
      }),
    },
    resultComment: `${MISSING_RESULT_COMMENTS.MASS_NET_WEIGHT(undefined as unknown)} ${INVALID_RESULT_COMMENTS.MASS_NET_WEIGHT_FORMAT}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${MASS_NET_WEIGHT} attribute is missing`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [...validWeighingAttributes, [TARE, undefined]],
      }),
    },
    resultComment: `${MISSING_RESULT_COMMENTS.TARE(undefined as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${TARE} attribute is missing`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [DESCRIPTION, undefined],
          ...validWeighingAttributes,
        ],
      }),
    },
    resultComment: MISSING_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${DESCRIPTION} attribute is missing`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [[DESCRIPTION, ''], ...validWeighingAttributes],
      }),
    },
    resultComment: MISSING_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${DESCRIPTION} attribute is an empty string`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [WEIGHING_CAPTURE_METHOD, DocumentEventWeighingCaptureMethod.DIGITAL],
          ...validWeighingAttributes,
          [SCALE_TYPE, scaleTypeMismatch],
        ],
      }),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.SCALE_TYPE_MISMATCH(
      scaleTypeMismatch,
      scaleType,
    )} ${INVALID_RESULT_COMMENTS.SCALE_TYPE(scaleTypeMismatch)}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${SCALE_TYPE} attribute is not equal to the ${SCALE_TYPE} attribute in the Recycler Homologation document and is not supported by the methodology`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [WEIGHING_CAPTURE_METHOD, weighingCaptureMethodMismatch],
          [SCALE_TYPE, scaleType],
        ],
      }),
    },
    resultComment: INVALID_RESULT_COMMENTS.WEIGHING_CAPTURE_METHOD(
      weighingCaptureMethodMismatch,
    ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${WEIGHING_CAPTURE_METHOD} attribute is not supported by the methodology`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [VEHICLE_LICENSE_PLATE, undefined],
          ...validWeighingAttributes,
        ],
      }),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT} ${INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_SENSITIVE}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${VEHICLE_LICENSE_PLATE} attribute is missing and is not sensitive`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          [CONTAINER_TYPE, undefined],
          ...validWeighingAttributes,
        ],
      }),
    },
    resultComment: MISSING_RESULT_COMMENTS.CONTAINER_TYPE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${CONTAINER_TYPE} attribute is missing`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [...validWeighingAttributes],
      }),
    },
    resultComment: APPROVED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the one step ${WEIGHING} event is valid`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(twoStepScaleType),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
      }),
    },
    resultComment:
      INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the two step ${WEIGHING} event participant ids do not match`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(twoStepScaleType),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
        },
      }),
    },
    resultComment: APPROVED_RESULT_COMMENTS.TWO_STEP,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the two step ${WEIGHING} events are valid`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(twoStepScaleType),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
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
        },
      }),
    },
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_VALUES({
      attributeName: CONTAINER_CAPACITY,
      firstValue: 2,
      secondValue: 1,
    }),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the two step ${WEIGHING} event ${CONTAINER_CAPACITY} attribute values do not match`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(
      DocumentEventScaleType.CONVEYOR_BELT_SCALE,
    ),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, DocumentEventScaleType.CONVEYOR_BELT_SCALE],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
        },
      }),
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, DocumentEventScaleType.CONVEYOR_BELT_SCALE],
          [CONTAINER_TYPE, DocumentEventContainerType.TRUCK],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
        },
      }),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(
      DocumentEventScaleType.CONVEYOR_BELT_SCALE,
    )} ${INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(
      DocumentEventScaleType.CONVEYOR_BELT_SCALE,
    )}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the two step ${WEIGHING} event scale type is not ${DocumentEventScaleType.WEIGHBRIDGE}`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(twoStepScaleType),
    massIdDocumentEvents: {
      [`${WEIGHING}-2`]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          [SCALE_TYPE, twoStepScaleType],
          [CONTAINER_TYPE, DocumentEventContainerType.BAG],
        ],
        partialDocumentEvent: {
          participant: twoStepWeighingEventParticipant,
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
        },
      }),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(
      DocumentEventContainerType.BAG,
    )} ${INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(
      DocumentEventContainerType.BAG,
    )}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the two step ${WEIGHING} event container type is not ${DocumentEventContainerType.TRUCK}`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
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
      }),
    },
    resultComment: APPROVED_RESULT_COMMENTS.TRANSPORT_MANIFEST,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the ${WEIGHING_CAPTURE_METHOD} attribute is ${DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST} and the ${WEIGHING} event is valid`,
  },
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          {
            format: KILOGRAM,
            name: MASS_NET_WEIGHT,
            value: 98,
          },
        ],
      }),
    },
    resultComment: INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
      calculatedNetWeight: 99,
      containerQuantity: 1,
      grossWeight: 100,
      massNetWeight: 98,
      tare: 1,
    }),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the calculated net weight is not equal to the mass net weight',
  },
];

export const temporary = [
  {
    homologationDocuments: stubBaseHomologationDocuments(),
    massIdDocumentEvents: {
      [WEIGHING]: stubBoldMassIdWeighingEvent({
        metadataAttributes: [
          ...validWeighingAttributes,
          {
            format: KILOGRAM,
            name: MASS_NET_WEIGHT,
            value: 98,
          },
        ],
      }),
    },
    resultComment: INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
      calculatedNetWeight: 99,
      containerQuantity: 1,
      grossWeight: 100,
      massNetWeight: 98,
      tare: 1,
    }),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the calculated net weight is not equal to the mass net weight',
  },
];

const processorErrors = new WeighingProcessorErrors();

const {
  massIdAuditDocument,
  massIdDocument,
  participantsHomologationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocument()
  .createMassIdAuditDocument()
  .createMethodologyDocuments()
  .createParticipantHomologationDocuments()
  .build();

export const weighingErrorTestCases = [
  {
    documents: [...participantsHomologationDocuments.values()],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document was not found`,
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the Recycler Homologation document was not found`,
  },
];
