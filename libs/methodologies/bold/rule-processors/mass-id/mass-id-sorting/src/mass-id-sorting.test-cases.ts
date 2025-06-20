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

import { MassIdSortingProcessorErrors } from './mass-id-sorting.errors';
import { RESULT_COMMENTS } from './mass-id-sorting.processor';

const processorErrors = new MassIdSortingProcessorErrors();

const { RECYCLER } = MethodologyDocumentEventLabel;
const {
  DROP_OFF,
  EMISSION_AND_COMPOSTING_METRICS,
  HOMOLOGATION_CONTEXT,
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

export const massIdSortingTestCases = [
  {
    actorParticipants,
    massIdEvents: {
      [SORTING]: stubBoldMassIdSortingEvent({
        metadataAttributes: [[DESCRIPTION, undefined]],
      }),
    },
    resultComment: RESULT_COMMENTS.MISSING_SORTING_DESCRIPTION,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting description is missing',
  },
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [EMISSION_AND_COMPOSTING_METRICS]:
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [[SORTING_FACTOR, sortingFactor]],
                partialDocumentEvent: {
                  participant: actorParticipants.get(
                    MassIdDocumentActorType.RECYCLER,
                  )!,
                },
              }),
            [HOMOLOGATION_CONTEXT]: stubDocumentEvent({
              name: HOMOLOGATION_CONTEXT,
              participant: actorParticipants.get(
                MassIdDocumentActorType.RECYCLER,
              )!,
            }),
          },
        },
      ],
    ]),
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
    resultComment: RESULT_COMMENTS.PASSED(0),
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the sorting value calculation difference is less or equal to 0.1',
  },
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [EMISSION_AND_COMPOSTING_METRICS]:
              stubBoldEmissionAndCompostingMetricsEvent({
                metadataAttributes: [[SORTING_FACTOR, sortingFactor]],
                partialDocumentEvent: {
                  participant: actorParticipants.get(
                    MassIdDocumentActorType.RECYCLER,
                  )!,
                },
              }),
            [HOMOLOGATION_CONTEXT]: stubDocumentEvent({
              name: HOMOLOGATION_CONTEXT,
              participant: actorParticipants.get(
                MassIdDocumentActorType.RECYCLER,
              )!,
            }),
          },
        },
      ],
    ]),
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
    resultComment: RESULT_COMMENTS.FAILED(
      Math.abs(calculatedSortingValue - wrongSortingValue),
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the sorting value calculation difference is greater than 0.1',
  },
];

const {
  massIdAuditDocument,
  massIdDocument,
  participantsHomologationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocuments({
    externalEventsMap: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: {
          value: 0,
        },
      }),
    },
  })
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantHomologationDocuments()
  .build();

const invalidSortingValue = new BoldStubsBuilder()
  .createMassIdDocuments({
    externalEventsMap: {
      [SORTING]: stubBoldMassIdSortingEvent({
        partialDocumentEvent: {
          value: 0,
        },
      }),
    },
  })
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantHomologationDocuments()
  .build();

export const massIdSortingErrorTestCases = [
  {
    documents: [...participantsHomologationDocuments.values()],
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
      ...participantsHomologationDocuments.values(),
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
      processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${RECYCLER} homologation does not exist`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
          (event) => event.name !== SORTING.toString(),
        ),
      },
      ...participantsHomologationDocuments.values(),
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
      ...invalidSortingValue.participantsHomologationDocuments.values(),
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
        // TODO: it's temporary, we need to remove when the homologation document is defined
        ...participantsHomologationDocuments.get(RECYCLER),
        externalEvents: participantsHomologationDocuments
          .get(RECYCLER)
          ?.externalEvents?.filter(
            (event) => !event.name.includes(EMISSION_AND_COMPOSTING_METRICS),
          ),
      } as Document,
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_SORTING_FACTOR,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${RECYCLER} homologation does not contain a ${SORTING_FACTOR} attribute`,
  },
  {
    documents: [massIdDocument, ...participantsHomologationDocuments.values()],
    massIdAuditDocument,
    resultComment:
      processorErrors.ERROR_MESSAGE.INVALID_VALUE_BEFORE_SORTING(0),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the value before sorting is not greater than 0`,
  },
];
