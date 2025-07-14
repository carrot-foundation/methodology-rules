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
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';
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
const { DESCRIPTION, SORTING_FACTOR } = DocumentEventAttributeName;

const sortingFactor = faker.number.float({ max: 1, min: 0 });
const valueBeforeSorting = faker.number.float({ min: 1 });
const calculatedSortingValue = valueBeforeSorting * sortingFactor;
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
      [SORTING]: stubBoldMassIdSortingEvent({
        metadataAttributes: [[DESCRIPTION, undefined]],
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
];

const invalidSortingValue = new BoldStubsBuilder()
  .createMassIdDocuments({
    externalEventsMap: {
      [SORTING]: stubBoldMassIdSortingEvent({
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
      massIdDocument,
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
];
