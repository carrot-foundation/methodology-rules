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
  type Document,
  type DocumentEvent,
  DocumentEventScaleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { type ApprovedException } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import {
  INVALID_RESULT_COMMENTS,
  NOT_FOUND_RESULT_COMMENTS,
  PASSED_RESULT_COMMENTS,
  WRONG_FORMAT_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';

const scaleType = stubEnumValue(DocumentEventScaleType);
const twoStepScaleType = DocumentEventScaleType['Weighbridge (Truck Scale)'];
const scaleTypeMismatch = faker.string.sample();
const weighingCaptureMethodMismatch = faker.string.sample();
const twoStepWeighingEventParticipant = stubParticipant();

// Deterministic values for manifestExample test cases
const MANIFEST_SCALE_TYPE = 'Floor Scale';
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
  scaleTypeValue?: DocumentEventScaleType;
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
          Category: 'MassID',
        },
        Event: 'Weighing',
      },
      'Attribute Name': 'Container Capacity',
      'Exception Type': 'Exemption for Mandatory Attribute',
      Reason: 'The container capacity is not required for this event',
    });
  }

  if (withContainerQuantityException) {
    exceptions.push({
      'Attribute Location': {
        Asset: {
          Category: 'MassID',
        },
        Event: 'Weighing',
      },
      'Attribute Name': 'Container Quantity',
      'Exception Type': 'Exemption for Mandatory Attribute',
      Reason: 'The container quantity is not required for this event',
    });
  }

  if (withTareException) {
    const tareException: ApprovedException = {
      'Attribute Location': {
        Asset: {
          Category: 'MassID',
        },
        Event: 'Weighing',
      },
      'Attribute Name': 'Tare',
      'Exception Type': 'Exemption for Mandatory Attribute',
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
      'Recycler',
      {
        externalEventsMap: {
          ['Accreditation Result']: stubBoldAccreditationResultEvent({
            metadataAttributes: [
              ...(exceptions.length > 0
                ? ([
                    ['Approved Exceptions', exceptions],
                  ] as MetadataAttributeParameter[])
                : []),
              ...(additionalVerifications.length > 0
                ? ([
                    [
                      'Required Additional Verifications',
                      additionalVerifications,
                    ],
                  ] as MetadataAttributeParameter[])
                : []),
            ],
          }),
          ['Monitoring Systems & Equipment']:
            stubBoldMonitoringSystemsAndEquipmentEvent({
              metadataAttributes: [['Scale Type', scaleTypeValue]],
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
  ['Weighing Capture Method', 'Digital'],
  ['Scale Type', scaleType],
  ['Container Quantity', 1],
  { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
  { format: 'KILOGRAM', name: 'Tare', value: 1 },
];

const manifestWeighingAttributes: MetadataAttributeParameter[] = [
  ['Weighing Capture Method', 'Digital'],
  ['Scale Type', MANIFEST_SCALE_TYPE],
  ['Container Quantity', 1],
  { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
  { format: 'KILOGRAM', name: 'Tare', value: 1 },
];

const validWeighingAttributesWithoutQuantity: MetadataAttributeParameter[] = [
  ['Weighing Capture Method', 'Digital'],
  ['Scale Type', scaleType],
  ['Container Quantity', undefined],
  { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
  { format: 'KILOGRAM', name: 'Tare', value: 1 },
];

const createTwoStepWeighingEvents = (
  scaleTypeValue: DocumentEventScaleType,
  participant: ReturnType<typeof stubParticipant>,
  firstEventOverrides: MetadataAttributeParameter[] = [],
  secondEventOverrides: MetadataAttributeParameter[] = firstEventOverrides,
) => ({
  ['Weighing-2']: createWeighingEvent(
    mergeAttributes(validWeighingAttributesWithoutQuantity, [
      ['Scale Type', scaleTypeValue],
      ['Container Type', 'Truck'],
      ...firstEventOverrides,
    ]),
    eventValue,
    participant,
  ),
  ['Weighing']: createWeighingEvent(
    mergeAttributes(validWeighingAttributesWithoutQuantity, [
      ['Scale Type', scaleTypeValue],
      ['Container Type', 'Truck'],
      ...secondEventOverrides,
    ]),
    eventValue,
    participant,
  ),
});

interface WeighingTestCase extends RuleTestCase {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIDDocumentEvents: Record<string, DocumentEvent | undefined>;
  scaleTicketVerificationError?: string;
}

export const weighingTestCases: WeighingTestCase[] = [
  {
    massIDDocumentEvents: {
      ['Weighing']: undefined,
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.NO_WEIGHING_EVENTS,
    resultStatus: 'FAILED',
    scenario: `The MassID document does not have "Weighing" events`,
  },
  {
    massIDDocumentEvents: {
      ['Weighing-1']: stubBoldMassIDWeighingEvent(),
      ['Weighing-2']: stubBoldMassIDWeighingEvent(),
      ['Weighing-3']: stubBoldMassIDWeighingEvent(),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.MORE_THAN_TWO_WEIGHING_EVENTS,
    resultStatus: 'FAILED',
    scenario: `The MassID document has more than two "Weighing" events`,
  },
  {
    accreditationDocuments: new Map([
      [
        'Recycler',
        {
          externalEventsMap: {
            ['Monitoring Systems & Equipment']: undefined,
          },
        },
      ],
    ]),
    massIDDocumentEvents: {
      ['Weighing']: stubBoldMassIDWeighingEvent({
        metadataAttributes: validWeighingAttributes,
        partialDocumentEvent: {
          value: eventValue,
        },
      }),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT,
    resultStatus: 'FAILED',
    scenario: `The Recycler Accreditation document does not have a "Scale Type" attribute`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Container Capacity', undefined],
        ]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_CAPACITY} ${INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "Container Capacity" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Container Type', 'Bag'],
          ['Container Quantity', undefined],
        ]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: 'FAILED',
    scenario: `The "Container Quantity" attribute is missing and the "Container Type" is "${'Bag'}"`,
  },
  {
    accreditationDocuments: new Map([
      [
        'Recycler',
        {
          externalEventsMap: {
            ['Accreditation Result']: undefined,
          },
        },
      ],
    ]),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Container Type', 'Bag'],
        ]),
      ),
    },
    resultComment: NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT,
    resultStatus: 'FAILED',
    scenario: `The "Accreditation Result" event is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Container Quantity', 1],
          ['Container Type', 'Truck'],
        ]),
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY,
    resultStatus: 'FAILED',
    scenario: `The "Container Quantity" attribute is defined, but the "Container Type" is "${'Truck'}"`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [['Gross Weight', undefined]]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.GROSS_WEIGHT(undefined as unknown)} ${INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "Gross Weight" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(validWeighingAttributes, 0),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.EVENT_VALUE(0),
    resultStatus: 'FAILED',
    scenario: 'The event value field is missing',
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [['Tare', undefined]]),
      ),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE(undefined as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "Tare" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [['Description', undefined]]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: 'FAILED',
    scenario: `The "Description" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [['Description', '']]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION,
    resultStatus: 'FAILED',
    scenario: `The "Description" attribute is an empty string`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Weighing Capture Method', 'Digital'],
          ['Scale Type', scaleTypeMismatch],
        ]),
      ),
    },
    resultComment: `${INVALID_RESULT_COMMENTS.SCALE_TYPE_MISMATCH(
      scaleTypeMismatch,
      scaleType,
    )} ${INVALID_RESULT_COMMENTS.SCALE_TYPE(scaleTypeMismatch)}`,
    resultStatus: 'FAILED',
    scenario: `The "Scale Type" attribute is not equal to the "Scale Type" attribute in the Recycler Accreditation document and is not supported by the methodology`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Weighing Capture Method', weighingCaptureMethodMismatch],
          ['Scale Type', scaleType],
        ]),
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.WEIGHING_CAPTURE_METHOD(
      weighingCaptureMethodMismatch,
    ),
    resultStatus: 'FAILED',
    scenario: `The "Weighing Capture Method" attribute is not supported by the methodology`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Vehicle License Plate', undefined],
        ]),
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT,
    resultStatus: 'FAILED',
    scenario: `The "Vehicle License Plate" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [['Container Type', undefined]]),
      ),
    },
    resultComment: WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_TYPE,
    resultStatus: 'FAILED',
    scenario: `The "Container Type" attribute is missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: MANIFEST_SCALE_TYPE,
    }),
    manifestExample: true,
    manifestFields: { includeValue: true },
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(manifestWeighingAttributes),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The one step "Weighing" event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withScaleTicketVerification: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(validWeighingAttributes),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_SCALE_TICKET_VALIDATION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The one step "Weighing" event is valid with scale ticket verification configured`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withScaleTicketVerification: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(validWeighingAttributes),
    },
    resultComment: 'Scale ticket mismatch',
    resultStatus: 'FAILED',
    scaleTicketVerificationError: 'Scale ticket mismatch',
    scenario: `Scale ticket verification fails for "Weighing" event`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withContainerCapacityException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Container Capacity', undefined],
        ]),
      ),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The one step "Weighing" event is valid with container capacity exception`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withContainerQuantityException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Container Type', 'Bag'],
          ['Container Quantity', undefined],
        ]),
      ),
    },
    resultComment:
      PASSED_RESULT_COMMENTS.PASSED_WITH_CONTAINER_QUANTITY_EXCEPTION(
        PASSED_RESULT_COMMENTS.SINGLE_STEP,
      ),
    resultStatus: 'PASSED',
    scenario: `The one step "Weighing" event is valid with container quantity exception for non-TRUCK container`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIDDocumentEvents: {
      ['Weighing-2']: createWeighingEvent(
        mergeAttributes(validWeighingAttributesWithoutQuantity, [
          ['Scale Type', twoStepScaleType],
          ['Container Type', 'Truck'],
        ]),
        eventValue,
        stubParticipant(),
      ),
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributesWithoutQuantity, [
          ['Scale Type', twoStepScaleType],
          ['Container Type', 'Truck'],
        ]),
        eventValue,
        stubParticipant(),
      ),
    },
    resultComment:
      INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS,
    resultStatus: 'FAILED',
    scenario: `The two step "Weighing" event participant ids do not match`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
      withContainerCapacityException: true,
    }),
    massIDDocumentEvents: createTwoStepWeighingEvents(
      twoStepScaleType,
      twoStepWeighingEventParticipant,
      [['Container Capacity', undefined]],
    ),
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_EXCEPTION(
      PASSED_RESULT_COMMENTS.TWO_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The two step "Weighing" events are valid with container capacity exception`,
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
    scenario: `The two step "Weighing" events are valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIDDocumentEvents: createTwoStepWeighingEvents(
      twoStepScaleType,
      twoStepWeighingEventParticipant,
      [],
      [{ format: 'KILOGRAM', name: 'Container Capacity', value: 2 }],
    ),
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_VALUES({
      attributeName: 'Container Capacity',
      firstValue: 2,
      secondValue: 1,
    }),
    resultStatus: 'FAILED',
    scenario: `The two step "Weighing" event "Container Capacity" attribute values do not match`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: 'Conveyor Belt Scale',
    }),
    massIDDocumentEvents: createTwoStepWeighingEvents(
      'Conveyor Belt Scale',
      twoStepWeighingEventParticipant,
    ),
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(
      'Conveyor Belt Scale',
    ),
    resultStatus: 'FAILED',
    scenario: `The two step "Weighing" event scale type is not "Weighbridge (Truck Scale)"`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: twoStepScaleType,
    }),
    massIDDocumentEvents: {
      ['Weighing-2']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Scale Type', twoStepScaleType],
          ['Container Type', 'Bag'],
        ]),
        eventValue,
        twoStepWeighingEventParticipant,
      ),
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          ['Scale Type', twoStepScaleType],
          ['Container Type', 'Bag'],
        ]),
        eventValue,
        twoStepWeighingEventParticipant,
      ),
    },
    resultComment: INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(
      'Bag',
    ),
    resultStatus: 'FAILED',
    scenario: `The two step "Weighing" event container type is not "${'Truck'}"`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: scaleType,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        mergeAttributes(validWeighingAttributes, [
          [
            'Weighing Capture Method',
            'Transport Manifest',
          ],
          ['Scale Type', scaleType],
        ]),
      ),
    },
    resultComment: PASSED_RESULT_COMMENTS.TRANSPORT_MANIFEST,
    resultStatus: 'PASSED',
    scenario: `The "Weighing Capture Method" attribute is "${'Transport Manifest'}" and the "Weighing" event is valid`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      scaleTypeValue: MANIFEST_SCALE_TYPE,
    }),
    manifestExample: true,
    manifestFields: { includeValue: true },
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(manifestWeighingAttributes, 98),
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
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
        ['Tare', undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The "Weighing" event is valid for TRUCK container with tare exception and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
        ['Tare', undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined' as unknown)} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "Weighing" event fails for TRUCK container without tare exception and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Bin'],
        ['Container Quantity', 1],
        { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
        ['Tare', undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The "Weighing" event is valid for non-TRUCK (BIN) container with tare exception and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent(
        [
          ['Weighing Capture Method', 'Digital'],
          ['Scale Type', scaleType],
          ['Container Type', 'Bin'],
          ['Container Quantity', 1],
          { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
          { format: 'KILOGRAM', name: 'Tare', value: 1 },
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
    scenario: `The "Weighing" event fails for non-TRUCK (BIN) container with tare exception when net weight calculation fails`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
        { format: 'KILOGRAM', name: 'Tare', value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The "Weighing" event is valid for TRUCK container with tare exception and Tare provided`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        ['Gross Weight', undefined],
        { format: 'KILOGRAM', name: 'Tare', value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The "Weighing" event is valid for TRUCK container with tare exception and missing Gross Weight`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      withTareException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        ['Gross Weight', undefined],
        ['Tare', undefined],
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(
      PASSED_RESULT_COMMENTS.SINGLE_STEP,
    ),
    resultStatus: 'PASSED',
    scenario: `The "Weighing" event is valid for TRUCK container with tare exception and both Tare and Gross Weight missing`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      tareExceptionValidUntil: '2020-01-01T00:00:00Z',
      withTareException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
        ['Tare', undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined')} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "Weighing" event fails for TRUCK container with expired tare exception (Valid Until in past) and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments({
      tareExceptionValidUntil: 'invalid-date-format',
      withTareException: true,
    }),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
        ['Tare', undefined],
      ]),
    },
    resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.TARE('undefined')} ${INVALID_RESULT_COMMENTS.TARE_FORMAT}`,
    resultStatus: 'FAILED',
    scenario: `The "Weighing" event fails for TRUCK container with invalid tare exception Valid Until date format and missing Tare`,
  },
  {
    accreditationDocuments: stubBaseAccreditationDocuments(),
    massIDDocumentEvents: {
      ['Weighing']: createWeighingEvent([
        ['Weighing Capture Method', 'Digital'],
        ['Scale Type', scaleType],
        ['Container Type', 'Truck'],
        ['Container Quantity', undefined],
        { format: 'KILOGRAM', name: 'Gross Weight', value: 100 },
        { format: 'KILOGRAM', name: 'Tare', value: 1 },
      ]),
    },
    resultComment: PASSED_RESULT_COMMENTS.SINGLE_STEP,
    resultStatus: 'PASSED',
    scenario: `The "Weighing" event is valid for TRUCK container without tare exception and both Tare and Gross Weight provided`,
  },
];

const processorErrors = new WeighingProcessorErrors();

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
  documents: Document[];
  massIDAuditDocument: Document;
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
