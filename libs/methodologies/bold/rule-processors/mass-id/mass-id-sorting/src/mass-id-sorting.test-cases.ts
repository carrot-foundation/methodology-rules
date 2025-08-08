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
    massIdEvents: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: { value: valueBeforeSorting },
      }),
      [SORTING]: stubBoldMassIdSortingEvent({
        metadataAttributes: [
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
          [DESCRIPTION, undefined],
        ],
      }),
    },
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.MISSING_SORTING_DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting description is missing',
  },
  {
    accreditationDocuments: new Map([
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
    ]),
    actorParticipants,
    massIdEvents: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: {
          value: valueBeforeSorting,
        },
      }),
      [SORTING]: stubBoldMassIdSortingEvent({
        metadataAttributes: [
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
        ],
        partialDocumentEvent: {
          value: calculatedSortingValue,
        },
      }),
    },
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.PASSED(0),
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the sorting value calculation difference is less or equal to 0.1',
  },
  {
    accreditationDocuments: new Map([
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
    ]),
    actorParticipants,
    massIdEvents: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: {
          value: valueBeforeSorting,
        },
      }),
      [SORTING]: stubBoldMassIdSortingEvent({
        metadataAttributes: [
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
        ],
        partialDocumentEvent: {
          value: wrongSortingValue,
        },
      }),
    },
    partialDocument: massIdDocument,
    resultComment: RESULT_COMMENTS.FAILED(
      Math.abs(calculatedSortingValue - wrongSortingValue),
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting value calculation difference is greater than 0.1',
  },
  {
    accreditationDocuments: new Map([
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
    ]),
    actorParticipants,
    massIdEvents: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: {
          value: valueBeforeSorting,
        },
      }),
      [SORTING]: stubBoldMassIdSortingEvent({
        metadataAttributes: [
          {
            format: KILOGRAM,
            name: GROSS_WEIGHT,
            value: grossWeight,
          },
          {
            format: KILOGRAM,
            name: DEDUCTED_WEIGHT,
            value: deductedWeight + 0.2, // Incorrect deducted weight
          },
        ],
        partialDocumentEvent: {
          value: calculatedSortingValue,
        },
      }),
    },
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
    accreditationDocuments: new Map([
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
    ]),
    actorParticipants,
    massIdEvents: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: {
          value: valueBeforeSorting,
        },
      }),
      [SORTING]: stubBoldMassIdSortingEvent({
        metadataAttributes: [
          {
            format: KILOGRAM,
            name: GROSS_WEIGHT,
            value: grossWeight + 0.2,
          },
          {
            format: KILOGRAM,
            name: DEDUCTED_WEIGHT,
            value: (grossWeight + 0.2) * (1 - sortingFactor),
          },
        ],
        partialDocumentEvent: {
          value: calculatedSortingValue,
        },
      }),
    },
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
  {
    documents: [...participantsAccreditationDocuments.values()],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document does not exist',
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: [],
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_EXTERNAL_EVENTS,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document does not contain external events',
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${RECYCLER} accreditation does not exist`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
          (event) => event.name !== SORTING.toString(),
        ),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_SORTING_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the MassID document does not contain a ${SORTING} event`,
  },
  {
    documents: [
      invalidSortingValue.massIdDocument,
      invalidSortingValue.massIdAuditDocument,
      ...invalidSortingValue.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_VALUE_AFTER_SORTING(0),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the value after sorting is not valid`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.map((event) =>
          String(event.name) === String(SORTING)
            ? stubBoldMassIdSortingEvent({
                metadataAttributes: [
                  {
                    format: KILOGRAM,
                    name: GROSS_WEIGHT,
                    value: valueBeforeSorting,
                  },
                  {
                    format: KILOGRAM,
                    name: DEDUCTED_WEIGHT,
                    value: deductedWeight,
                  },
                ],
                partialDocumentEvent: {
                  value: massIdDocument.externalEvents?.find(
                    eventNameIsAnyOf([DROP_OFF]),
                  )?.value,
                },
              })
            : event,
        ),
      },
      {
        // TODO: it's temporary, we need to remove when the accreditation document is defined
        ...participantsAccreditationDocuments.get(RECYCLER),
        externalEvents: participantsAccreditationDocuments
          .get(RECYCLER)
          ?.externalEvents?.filter(
            (event) => !event.name.includes(EMISSION_AND_COMPOSTING_METRICS),
          ),
      } as Document,
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_SORTING_FACTOR,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${RECYCLER} accreditation does not contain a ${SORTING_FACTOR} attribute`,
  },
  {
    documents: [massIdDocument, ...participantsAccreditationDocuments.values()],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_VALUE_BEFORE_SORTING(0),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the value before sorting is not greater than 0`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.map((event) => {
          if (event.name === String(DROP_OFF)) {
            return { ...event, value: valueBeforeSorting };
          }

          if (event.name === String(SORTING)) {
            return stubBoldMassIdSortingEvent({
              metadataAttributes: [
                {
                  format: CUBIC_METER,
                  name: GROSS_WEIGHT,
                  value: 10,
                },
                {
                  format: KILOGRAM,
                  name: DEDUCTED_WEIGHT,
                  value: deductedWeight,
                },
              ],
              partialDocumentEvent: {
                value: calculatedSortingValue,
              },
            });
          }

          return event;
        }),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT_FORMAT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the gross weight has invalid format`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.map((event) => {
          if (String(event.name) === String(DROP_OFF)) {
            return { ...event, value: valueBeforeSorting }; // Ensure valid previous value
          }

          if (String(event.name) === String(SORTING)) {
            return stubBoldMassIdSortingEvent({
              metadataAttributes: [
                {
                  format: KILOGRAM,
                  name: GROSS_WEIGHT,
                  value: valueBeforeSorting,
                },
                {
                  format: CUBIC_METER,
                  name: DEDUCTED_WEIGHT,
                  value: 5,
                },
              ],
              partialDocumentEvent: {
                value: calculatedSortingValue,
              },
            });
          }

          return event;
        }),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT_FORMAT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the deducted weight has invalid format`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.map((event) => {
          if (event.name === String(DROP_OFF)) {
            return { ...event, value: valueBeforeSorting };
          }

          if (event.name === String(SORTING)) {
            return stubBoldMassIdSortingEvent({
              metadataAttributes: [
                {
                  format: KILOGRAM,
                  name: GROSS_WEIGHT,
                  value: 0,
                },
                {
                  format: KILOGRAM,
                  name: DEDUCTED_WEIGHT,
                  value: deductedWeight,
                },
              ],
              partialDocumentEvent: {
                value: calculatedSortingValue,
              },
            });
          }

          return event;
        }),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT(
      'Invalid gross weight: 0',
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the gross weight is not greater than 0`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.map((event) => {
          if (event.name === String(DROP_OFF)) {
            return { ...event, value: valueBeforeSorting };
          }

          if (event.name === String(SORTING)) {
            return stubBoldMassIdSortingEvent({
              metadataAttributes: [
                {
                  format: KILOGRAM,
                  name: GROSS_WEIGHT,
                  value: valueBeforeSorting,
                },
                {
                  format: KILOGRAM,
                  name: DEDUCTED_WEIGHT,
                  value: 0,
                },
              ],
              partialDocumentEvent: {
                value: calculatedSortingValue,
              },
            });
          }

          return event;
        }),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT(
      'Invalid deducted weight: 0',
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the deducted weight is not greater than 0`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.map((event) => {
          if (String(event.name) === String(DROP_OFF)) {
            return { ...event, value: valueBeforeSorting }; // Ensure valid previous value
          }

          if (String(event.name) === String(SORTING)) {
            return stubBoldMassIdSortingEvent({
              metadataAttributes: [
                {
                  format: CUBIC_METER,
                  name: GROSS_WEIGHT,
                  value: 15,
                },
                {
                  format: KILOGRAM,
                  name: DEDUCTED_WEIGHT,
                  value: 8,
                },
              ],
              partialDocumentEvent: {
                value: 7, // 15 - 8
              },
            });
          }

          return event;
        }),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT_FORMAT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the gross weight has valid value but invalid format`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.map((event) => {
          if (event.name === String(DROP_OFF)) {
            return { ...event, value: valueBeforeSorting };
          }

          if (event.name === String(SORTING)) {
            return stubBoldMassIdSortingEvent({
              metadataAttributes: [
                {
                  format: KILOGRAM,
                  name: GROSS_WEIGHT,
                  value: 15,
                },
                {
                  format: CUBIC_METER,
                  name: DEDUCTED_WEIGHT,
                  value: 8,
                },
              ],
              partialDocumentEvent: {
                value: 7,
              },
            });
          }

          return event;
        }),
      },
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT_FORMAT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the deducted weight has valid value but invalid format`,
  },
];
