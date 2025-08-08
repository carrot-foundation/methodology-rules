import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  BoldStubsBuilder,
  MASS_ID_ACTOR_PARTICIPANTS,
  stubBoldEmissionAndCompostingMetricsEvent,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdSortingEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { addYears } from 'date-fns';

import { MassIdSortingProcessorErrors } from './mass-id-sorting.errors';
import { RESULT_COMMENTS } from './mass-id-sorting.processor';

const processorErrors = new MassIdSortingProcessorErrors();

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
              MassIdDocumentActorType.RECYCLER,
            )!,
          }),
          [EMISSION_AND_COMPOSTING_METRICS]:
            stubBoldEmissionAndCompostingMetricsEvent({
              metadataAttributes: [[SORTING_FACTOR, sortingFactor]],
              partialDocumentEvent: {
                participant: actorParticipants.get(
                  MassIdDocumentActorType.RECYCLER,
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

const createMassIdEvents = (
  valueBeforeSorting: number,
  grossWeight: number,
  deductedWeight: number,
  sortingValue?: number,
  includeDescription = true,
) => ({
  [DROP_OFF]: stubBoldMassIdDropOffEvent({
    partialDocumentEvent: { value: valueBeforeSorting },
  }),
  [SORTING]: stubBoldMassIdSortingEvent({
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
  massIdAuditDocument,
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
const deductedWeight = grossWeight * (1 - sortingFactor);
const calculatedSortingValue = grossWeight - deductedWeight;
const wrongSortingValue = calculatedSortingValue + 0.15;

const actorParticipants = new Map(
  MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
    subtype,
    stubParticipant({ id: faker.string.uuid(), type: subtype }),
  ]),
);

const {
  massIdAuditDocument,
  massIdDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocuments({
    externalEventsMap: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: {
          value: 0,
        },
      }),
      [SORTING]: stubBoldMassIdSortingEvent({
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
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const massIdSortingTestCases = [
  {
    actorParticipants,
    massIdEvents: createMassIdEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      undefined,
      false,
    ),
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.MISSING_SORTING_DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting description is missing',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIdEvents: createMassIdEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      calculatedSortingValue,
    ),
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.PASSED(0),
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the sorting value calculation difference is less or equal to 0.1',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIdEvents: createMassIdEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight,
      wrongSortingValue,
    ),
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.FAILED(
      Math.abs(calculatedSortingValue - wrongSortingValue),
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting value calculation difference is greater than 0.1',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIdEvents: createMassIdEvents(
      valueBeforeSorting,
      grossWeight,
      deductedWeight + 0.2,
      calculatedSortingValue,
    ),
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.DEDUCTED_WEIGHT_MISMATCH(
      deductedWeight + 0.2,
      Number((grossWeight * (1 - sortingFactor)).toFixed(3)),
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the deducted weight does not match the expected value based on sorting factor',
  },
  {
    accreditationDocuments: createAccreditationDocuments(sortingFactor),
    actorParticipants,
    massIdEvents: createMassIdEvents(
      valueBeforeSorting,
      grossWeight + 0.2,
      (grossWeight + 0.2) * (1 - sortingFactor),
      calculatedSortingValue,
    ),
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.GROSS_WEIGHT_MISMATCH(
      grossWeight + 0.2,
      valueBeforeSorting,
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the gross weight does not match the previous event value',
  },
];

const invalidSortingValue = new BoldStubsBuilder()
  .createMassIdDocuments({
    externalEventsMap: {
      [SORTING]: stubBoldMassIdSortingEvent({
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
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const massIdSortingErrorTestCases = [
  createErrorTestCase(
    'the MassID document does not exist',
    [...participantsAccreditationDocuments.values()],
    processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
  ),
  createErrorTestCase(
    'the MassID document does not contain external events',
    [
      { ...massIdDocument, externalEvents: [] },
      ...participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.MISSING_EXTERNAL_EVENTS,
  ),
  createErrorTestCase(
    `the ${RECYCLER} accreditation does not exist`,
    [massIdDocument],
    processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
  ),
  createErrorTestCase(
    `the MassID document does not contain a ${SORTING} event`,
    [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
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
      invalidSortingValue.massIdDocument,
      invalidSortingValue.massIdAuditDocument,
      ...invalidSortingValue.participantsAccreditationDocuments.values(),
    ],
    processorErrors.ERROR_MESSAGE.INVALID_VALUE_AFTER_SORTING(0),
  ),
  createErrorTestCase(
    `the ${RECYCLER} accreditation does not contain a ${SORTING_FACTOR} attribute`,
    [
      modifyDocumentEvents(massIdDocument, {
        [String(SORTING)]: stubBoldMassIdSortingEvent({
          metadataAttributes: createWeightAttributes(
            valueBeforeSorting,
            deductedWeight,
          ),
          partialDocumentEvent: {
            value: massIdDocument.externalEvents?.find(
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
    [massIdDocument, ...participantsAccreditationDocuments.values()],
    processorErrors.ERROR_MESSAGE.INVALID_VALUE_BEFORE_SORTING(0),
  ),
  createErrorTestCase(
    'the gross weight has invalid format',
    [
      modifyDocumentEvents(massIdDocument, {
        [String(DROP_OFF)]: {
          ...massIdDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIdSortingEvent({
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
      modifyDocumentEvents(massIdDocument, {
        [String(DROP_OFF)]: {
          ...massIdDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIdSortingEvent({
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
      modifyDocumentEvents(massIdDocument, {
        [String(DROP_OFF)]: {
          ...massIdDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIdSortingEvent({
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
      modifyDocumentEvents(massIdDocument, {
        [String(DROP_OFF)]: {
          ...massIdDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIdSortingEvent({
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
      modifyDocumentEvents(massIdDocument, {
        [String(DROP_OFF)]: {
          ...massIdDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIdSortingEvent({
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
      modifyDocumentEvents(massIdDocument, {
        [String(DROP_OFF)]: {
          ...massIdDocument.externalEvents?.find(
            (e) => e.name === String(DROP_OFF),
          ),
          value: valueBeforeSorting,
        },
        [String(SORTING)]: stubBoldMassIdSortingEvent({
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
];
