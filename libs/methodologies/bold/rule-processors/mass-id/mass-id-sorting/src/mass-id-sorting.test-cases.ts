import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  BoldStubsBuilder,
  MASS_ID_ACTOR_PARTICIPANTS,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDSortingEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { addYears } from 'date-fns';

import { MassIDSortingProcessorErrors } from './mass-id-sorting.errors';
import {
  RESULT_COMMENTS,
  SORTING_TOLERANCE,
} from './mass-id-sorting.processor';

const processorErrors = new MassIDSortingProcessorErrors();

const { RECYCLER } = MethodologyDocumentEventLabel;
const {
  ACCREDITATION_CONTEXT,
  DROP_OFF,
  EMISSION_AND_COMPOSTING_METRICS,
  SORTING,
} = DocumentEventName;
const { DEDUCTED_WEIGHT, DESCRIPTION, GROSS_WEIGHT, SORTING_FACTOR } =
  DocumentEventAttributeName;
const { CUBIC_METER, KILOGRAM } = MethodologyDocumentEventAttributeFormat;

// Helper functions to reduce duplication
const createAccreditationDocuments = (sortingFactor: number) =>
  new Map([
    [
      RECYCLER,
      {
        externalEventsMap: {
          [ACCREDITATION_CONTEXT]: stubDocumentEvent({
            name: ACCREDITATION_CONTEXT,
            participant: actorParticipants.get(
              MassIDDocumentActorType.RECYCLER,
            )!,
          }),
          [EMISSION_AND_COMPOSTING_METRICS]:
            stubBoldEmissionAndCompostingMetricsEvent({
              metadataAttributes: [[SORTING_FACTOR, sortingFactor]],
              partialDocumentEvent: {
                participant: actorParticipants.get(
                  MassIDDocumentActorType.RECYCLER,
                )!,
              },
            }),
        },
      },
    ],
  ]);

const createWeightAttributes = (
  grossWeight: number,
  deductedWeight: number,
) => [
  {
    format: KILOGRAM,
    name: GROSS_WEIGHT,
    value: grossWeight,
  },
  {
    format: KILOGRAM,
    name: DEDUCTED_WEIGHT,
    value: deductedWeight,
  },
];

const createMassIDEvents = (
  valueBeforeSorting: number,
  grossWeight: number,
  deductedWeight: number,
  sortingValue?: number,
  includeDescription = true,
) => ({
  [DROP_OFF]: stubBoldMassIDDropOffEvent({
    partialDocumentEvent: { value: valueBeforeSorting },
  }),
  [SORTING]: stubBoldMassIDSortingEvent({
    metadataAttributes: [
      ...createWeightAttributes(grossWeight, deductedWeight),
      ...(includeDescription
        ? []
        : [
            [DESCRIPTION, undefined] as [DocumentEventAttributeName, undefined],
          ]),
    ],
    ...(sortingValue !== undefined && {
      partialDocumentEvent: { value: sortingValue },
    }),
  }),
});

const modifyDocumentEvents = (
  baseDocument: Document,
  eventModifiers: Record<string, unknown>,
): Document => ({
  ...baseDocument,
  externalEvents: baseDocument.externalEvents?.map((event) => {
    const eventName = String(event.name);

    return (eventModifiers[eventName] ?? event) as DocumentEvent;
  }),
});

const createErrorTestCase = (
  scenario: string,
  documents: Document[],
  resultComment: string,
) => ({
  documents,
  massIDAuditDocument,
  resultComment,
  resultStatus: RuleOutputStatus.FAILED,
  scenario,
});

const createWeightAttributesWithFormat = (
  grossWeight: number,
  deductedWeight: number,
  grossFormat = KILOGRAM,
  deductedFormat = KILOGRAM,
) => [
  {
    format: grossFormat,
    name: GROSS_WEIGHT,
    value: grossWeight,
  },
  {
    format: deductedFormat,
    name: DEDUCTED_WEIGHT,
    value: deductedWeight,
  },
];

const sortingFactor = faker.number.float({ max: 1, min: 0 });
const valueBeforeSorting = faker.number.float({ min: 1 });
const grossWeight = valueBeforeSorting;
const expectedDeductedWeight = grossWeight * (1 - sortingFactor);
const deductedWeight = expectedDeductedWeight;
const calculatedSortingValue = grossWeight - expectedDeductedWeight;
const wrongSortingValue = calculatedSortingValue + 0.15;
const delta = SORTING_TOLERANCE + 0.01;
const mismatchedDeductedWeight =
  expectedDeductedWeight > delta
    ? expectedDeductedWeight - delta
    : expectedDeductedWeight + delta;

const actorParticipants = new Map(
  MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
    subtype,
    stubParticipant({ id: faker.string.uuid(), type: subtype }),
  ]),
);

const {
  massIDAuditDocument,
  massIDDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIDDocuments({
    externalEventsMap: {
      [DROP_OFF]: stubBoldMassIDDropOffEvent({
        partialDocumentEvent: {
          value: 0,
        },
      }),
      [SORTING]: stubBoldMassIDSortingEvent({
        metadataAttributes: [
          {
            format: KILOGRAM,
            name: GROSS_WEIGHT,
            value: valueBeforeSorting,
          },
          {
            format: KILOGRAM,
            name: DEDUCTED_WEIGHT,
            value: faker.number.float({
              max: valueBeforeSorting / 2,
              min: 0.1,
            }),
          },
        ],
      }),
    },
    partialDocument: {
      externalCreatedAt: addYears(new Date(), 1).toISOString(),
    },
  })
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const massIDSortingTestCases = [
  {
    actorParticipants,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      calculatedSortingValue,
      false,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue,
    },
    resultComment: RESULT_COMMENTS.MISSING_SORTING_DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting description is missing',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      calculatedSortingValue,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue,
    },
    resultComment: RESULT_COMMENTS.PASSED(0),
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the sorting value calculation difference is less or equal to 0.1',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      calculatedSortingValue,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue + 1,
    },
    resultComment: RESULT_COMMENTS.DOCUMENT_VALUE_MISMATCH(
      calculatedSortingValue + 1,
      calculatedSortingValue,
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the document current value does not match the sorting event value',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      wrongSortingValue,
    ),
    partialDocument: { ...massIDDocument, currentValue: wrongSortingValue },
    resultComment: RESULT_COMMENTS.FAILED(
      Math.abs(calculatedSortingValue - wrongSortingValue),
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting value calculation difference is greater than 0.1',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight,
      mismatchedDeductedWeight,
      calculatedSortingValue,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue,
    },
    resultComment: RESULT_COMMENTS.DEDUCTED_WEIGHT_MISMATCH(
      mismatchedDeductedWeight,
      Number((grossWeight * (1 - sortingFactor)).toFixed(3)),
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the deducted weight does not match the expected value based on sorting factor',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIDEvents: createMassIDEvents(
      valueBeforeSorting,
      grossWeight + 0.2,
      (grossWeight + 0.2) * (1 - sortingFactor),
      calculatedSortingValue,
    ),
    partialDocument: {
      ...massIDDocument,
      currentValue: calculatedSortingValue,
    },
    resultComment: RESULT_COMMENTS.GROSS_WEIGHT_MISMATCH(
      grossWeight + 0.2,
      valueBeforeSorting,
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the gross weight does not match the previous event value',
  },
];

const invalidSortingValue = new BoldStubsBuilder()
  .createMassIDDocuments({
    externalEventsMap: {
      [SORTING]: stubBoldMassIDSortingEvent({
        metadataAttributes: [
          {
            format: KILOGRAM,
            name: GROSS_WEIGHT,
            value: faker.number.float({ min: 1 }),
          },
          {
            format: KILOGRAM,
            name: DEDUCTED_WEIGHT,
            value: faker.number.float({ min: 0.1 }),
          },
        ],
        partialDocumentEvent: {
          value: 0,
        },
      }),
    },
    partialDocument: {
      externalCreatedAt: addYears(new Date(), 1).toISOString(),
    },
  })
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const massIDSortingErrorTestCases = [
  createErrorTestCase(
    'the MassID document does not exist',
    [...participantsAccreditationDocuments.values()],
    processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
  ),
  createErrorTestCase(
    'the MassID document does not contain external events',
    [
      { ...massIDDocument, externalEvents: [] },
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.MISSING_EXTERNAL_EVENTS,
  ),
  createErrorTestCase(
    `the ${RECYCLER} accreditation does not exist`,
    [massIDDocument],
    processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
  ),
  createErrorTestCase(
    `the MassID document does not contain a ${SORTING} event`,
    [
      {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.name !== SORTING.toString(),
        ),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.MISSING_SORTING_EVENT,
  ),
  createErrorTestCase(
    'the value after sorting is not valid',
    [
      invalidSortingValue.massIDDocument,
      invalidSortingValue.massIDAuditDocument,
      ...invalidSortingValue.participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_VALUE_AFTER_SORTING(0),
  ),
  createErrorTestCase(
    `the ${RECYCLER} accreditation does not contain a ${SORTING_FACTOR} attribute`,
    [
      modifyDocumentEvents(massIDDocument, {
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(
            valueBeforeSorting,
            deductedWeight,
          ),
          partialDocumentEvent: {
            value: massIDDocument.externalEvents?.find(
              eventNameIsAnyOf([DROP_OFF]),
            )?.value,
          },
        }),
      }),
      {
        ...participantsAccreditationDocuments.get(RECYCLER),
        externalEvents: participantsAccreditationDocuments
          .get(RECYCLER)
          ?.externalEvents?.filter(
            (event) => !event.name.includes(EMISSION_AND_COMPOSTING_METRICS),
          ),
      } as Document,
    ],
    processorErrors.ERROR_MESSAGE.MISSING_SORTING_FACTOR,
  ),
  createErrorTestCase(
    'the value before sorting is not greater than 0',
    [massIDDocument, ...participantsAccreditationDocuments.values()],
    processorErrors.ERROR_MESSAGE.INVALID_VALUE_BEFORE_SORTING(0),
  ),
  createErrorTestCase(
    'the gross weight has invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        [String(DROP_OFF)]: {
          ...massIDDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            10,
            deductedWeight,
            CUBIC_METER,
            KILOGRAM,
          ),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'the deducted weight has invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        [String(DROP_OFF)]: {
          ...massIDDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            valueBeforeSorting,
            5,
            KILOGRAM,
            CUBIC_METER,
          ),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'the gross weight is not greater than 0',
    [
      modifyDocumentEvents(massIDDocument, {
        [String(DROP_OFF)]: {
          ...massIDDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(0, deductedWeight),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT(0),
  ),
  createErrorTestCase(
    'the deducted weight is not greater than 0',
    [
      modifyDocumentEvents(massIDDocument, {
        [String(DROP_OFF)]: {
          ...massIDDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(valueBeforeSorting, 0),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT(0),
  ),
  createErrorTestCase(
    'the gross weight has valid value but invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        [String(DROP_OFF)]: {
          ...massIDDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            15,
            8,
            CUBIC_METER,
            KILOGRAM,
          ),
          partialDocumentEvent: { value: 7 },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'the deducted weight has valid value but invalid format',
    [
      modifyDocumentEvents(massIDDocument, {
        [String(DROP_OFF)]: {
          ...massIDDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributesWithFormat(
            15,
            8,
            KILOGRAM,
            CUBIC_METER,
          ),
          partialDocumentEvent: { value: 7 },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT_FORMAT,
  ),
  createErrorTestCase(
    'the deducted weight is greater than or equal to gross weight',
    [
      modifyDocumentEvents(massIDDocument, {
        [String(DROP_OFF)]: {
          ...massIDDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIDSortingEvent({
          metadataAttributes: createWeightAttributes(5, 10),
          partialDocumentEvent: { value: calculatedSortingValue },
        }),
      }),
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_WEIGHT_COMPARISON(10, 5),
  ),
];
