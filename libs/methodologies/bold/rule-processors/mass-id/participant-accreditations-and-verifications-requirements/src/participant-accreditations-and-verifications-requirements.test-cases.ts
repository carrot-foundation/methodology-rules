import {
  BoldStubsBuilder,
  stubBoldAccreditationResultEvent,
  stubDocument,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentEventAccreditationStatus,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentType,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { addDays, subDays } from 'date-fns';

import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';
import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.processor';

const { HAULER, INTEGRATOR, PROCESSOR, RECYCLER, WASTE_GENERATOR } =
  MassIDDocumentActorType;
const { ACCREDITATION_CONTEXT, ACCREDITATION_RESULT, LINK } = DocumentEventName;
const { ACCREDITATION_STATUS, EFFECTIVE_DATE, EXPIRATION_DATE } =
  DocumentEventAttributeName;

const processorError =
  new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors();

const createValidAccreditationResultEvent = () =>
  stubBoldAccreditationResultEvent({
    metadataAttributes: [
      [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
      [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
      [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
    ],
  });

const createExpiredAccreditationResultEvent = () =>
  stubBoldAccreditationResultEvent({
    metadataAttributes: [
      [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
      [EXPIRATION_DATE, subDays(new Date(), 2).toISOString()],
      [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
    ],
  });

const createMassIDWithActorAccreditation = (
  actorType: MassIDDocumentActorType,
  externalEventsMap: Map<
    DocumentEventName,
    ReturnType<typeof stubBoldAccreditationResultEvent>
  >,
) =>
  new BoldStubsBuilder()
    .createMassIDDocuments()
    .createMassIDAuditDocuments()
    .createMethodologyDocument()
    .createParticipantAccreditationDocuments(
      new Map([[actorType, { externalEventsMap }]]),
    )
    .build();

const createMassIDWithMultipleActorAccreditations = (
  actorAccreditations: Map<
    MassIDDocumentActorType,
    {
      externalEventsMap: Map<
        DocumentEventName,
        ReturnType<typeof stubBoldAccreditationResultEvent>
      >;
    }
  >,
  massIDActorParticipants?: Map<
    MassIDDocumentActorType,
    ReturnType<typeof stubParticipant>
  >,
) => {
  const builder = massIDActorParticipants
    ? new BoldStubsBuilder({ massIDActorParticipants })
    : new BoldStubsBuilder();

  return builder
    .createMassIDDocuments()
    .createMassIDAuditDocuments()
    .createMethodologyDocument()
    .createParticipantAccreditationDocuments(actorAccreditations)
    .build();
};

const createMassIDAuditWithLinkEvent = (
  massIDAuditDocument: ReturnType<
    typeof createMassIDWithActorAccreditation
  >['massIDAuditDocument'],
  secondAccreditation: ReturnType<typeof stubDocument>,
) => ({
  ...massIDAuditDocument,
  externalEvents: [
    ...(massIDAuditDocument.externalEvents ?? []),
    stubDocumentEvent({
      name: LINK,
      relatedDocument: {
        ...mapDocumentRelation(secondAccreditation),
        bidirectional: false,
      },
    }),
  ],
});

const createMultipleValidAccreditationsTestData = (
  actorType: MassIDDocumentActorType,
) => {
  const massIDWithMultipleValid = new BoldStubsBuilder()
    .createMassIDDocuments()
    .createMassIDAuditDocuments()
    .createMethodologyDocument()
    .createParticipantAccreditationDocuments(
      new Map([
        [
          actorType,
          {
            externalEventsMap: new Map([
              [ACCREDITATION_RESULT, createValidAccreditationResultEvent()],
            ]),
          },
        ],
      ]),
    )
    .build();

  const originalAccreditation =
    massIDWithMultipleValid.participantsAccreditationDocuments.get(actorType)!;

  const secondAccreditation = stubDocument(
    {
      category: DocumentCategory.METHODOLOGY,
      externalEvents: [
        stubBoldAccreditationResultEvent({
          metadataAttributes: [
            [EFFECTIVE_DATE, subDays(new Date(), 5).toISOString()],
            [EXPIRATION_DATE, addDays(new Date(), 5).toISOString()],
            [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
          ],
        }),
      ],
      primaryParticipant: originalAccreditation.primaryParticipant,
      subtype: actorType,
      type: DocumentType.PARTICIPANT_ACCREDITATION,
    },
    false, // stubExternalEvents = false to avoid random events
  );

  return {
    massIDWithMultipleValid,
    originalAccreditation,
    secondAccreditation,
  };
};

const massIDAuditWithAccreditationsAndVerifications = new BoldStubsBuilder()
  .createMassIDDocuments()
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

const massIDWithExpiredAccreditation = createMassIDWithActorAccreditation(
  INTEGRATOR,
  new Map([[ACCREDITATION_RESULT, createExpiredAccreditationResultEvent()]]),
);

const massIDWithWasteGeneratorNoResult = createMassIDWithActorAccreditation(
  WASTE_GENERATOR,
  new Map([
    [
      ACCREDITATION_CONTEXT,
      stubDocumentEvent({
        name: ACCREDITATION_CONTEXT,
      }),
    ],
  ]),
);

const massIDWithWasteGeneratorValidResult = createMassIDWithActorAccreditation(
  WASTE_GENERATOR,
  new Map([[ACCREDITATION_RESULT, createValidAccreditationResultEvent()]]),
);

const massIDWithWasteGeneratorInvalidResult =
  createMassIDWithActorAccreditation(
    WASTE_GENERATOR,
    new Map([[ACCREDITATION_RESULT, createExpiredAccreditationResultEvent()]]),
  );

const {
  massIDWithMultipleValid: massIDWithWasteGeneratorMultipleValid,
  secondAccreditation: wasteGeneratorSecondAccreditation,
} = createMultipleValidAccreditationsTestData(WASTE_GENERATOR);

const {
  massIDWithMultipleValid: massIDWithProcessorMultipleValid,
  originalAccreditation: processorOriginalAccreditation,
  secondAccreditation: processorSecondAccreditation,
} = createMultipleValidAccreditationsTestData(PROCESSOR);

// Create a participant that has both PROCESSOR and RECYCLER roles
const sharedParticipant = stubParticipant({ type: PROCESSOR });

const massIDWithParticipantMultipleRoles =
  createMassIDWithMultipleActorAccreditations(
    new Map([
      [
        INTEGRATOR,
        {
          externalEventsMap: new Map([
            [ACCREDITATION_RESULT, createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        PROCESSOR,
        {
          externalEventsMap: new Map([
            [ACCREDITATION_RESULT, createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        RECYCLER,
        {
          externalEventsMap: new Map([
            [ACCREDITATION_RESULT, createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_CONTEXT,
              stubDocumentEvent({
                name: ACCREDITATION_CONTEXT,
              }),
            ],
          ]),
        },
      ],
    ]),
    new Map([
      [HAULER, stubParticipant({ type: HAULER })],
      [INTEGRATOR, stubParticipant({ type: INTEGRATOR })],
      [PROCESSOR, sharedParticipant],
      [RECYCLER, sharedParticipant],
      [WASTE_GENERATOR, stubParticipant({ type: WASTE_GENERATOR })],
    ]),
  );

const massIDWithWasteGeneratorButNoAccreditation =
  createMassIDWithMultipleActorAccreditations(
    new Map([
      [
        INTEGRATOR,
        {
          externalEventsMap: new Map([
            [ACCREDITATION_RESULT, createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        PROCESSOR,
        {
          externalEventsMap: new Map([
            [ACCREDITATION_RESULT, createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        RECYCLER,
        {
          externalEventsMap: new Map([
            [ACCREDITATION_RESULT, createValidAccreditationResultEvent()],
          ]),
        },
      ],
    ]),
    new Map([
      [INTEGRATOR, stubParticipant({ type: INTEGRATOR })],
      [PROCESSOR, stubParticipant({ type: PROCESSOR })],
      [RECYCLER, stubParticipant({ type: RECYCLER })],
      [WASTE_GENERATOR, stubParticipant({ type: WASTE_GENERATOR })],
    ]),
  );

export const participantAccreditationsAndVerificationsRequirementsTestCases = [
  {
    documents: [
      massIDAuditWithAccreditationsAndVerifications.massIDDocument,
      ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument:
      massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the participants accreditation documents are found and the accreditation is active',
  },
  {
    documents: [massIDAuditWithAccreditationsAndVerifications.massIDDocument],
    massIDAuditDocument:
      massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.ACCREDITATION_DOCUMENTS_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the participants accreditation documents are not found',
  },
  {
    documents: [
      massIDAuditWithAccreditationsAndVerifications.massIDDocument,
      ...[
        ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
      ].filter((document) => document.subtype !== INTEGRATOR),
    ],
    massIDAuditDocument:
      massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
        [INTEGRATOR],
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'some participants accreditation documents are not found',
  },
  {
    documents: [
      ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument:
      massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
    resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the mass document does not exist',
  },
  {
    documents: [
      {
        ...massIDAuditWithAccreditationsAndVerifications.massIDDocument,
        externalEvents: [],
      },
      ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument:
      massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
        massIDAuditWithAccreditationsAndVerifications.massIDDocument.id,
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the mass document does not contain events',
  },
  {
    documents: [
      massIDWithExpiredAccreditation.massIDDocument,
      ...massIDWithExpiredAccreditation.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument: massIDWithExpiredAccreditation.massIDAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
        [INTEGRATOR],
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the participants accreditation documents are found and the accreditation is not active',
  },
  {
    documents: [
      massIDWithWasteGeneratorNoResult.massIDDocument,
      ...massIDWithWasteGeneratorNoResult.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument: massIDWithWasteGeneratorNoResult.massIDAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has accreditation document without result event (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIDWithWasteGeneratorValidResult.massIDDocument,
      ...massIDWithWasteGeneratorValidResult.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument:
      massIDWithWasteGeneratorValidResult.massIDAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has valid accreditation result event (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIDWithWasteGeneratorInvalidResult.massIDDocument,
      ...massIDWithWasteGeneratorInvalidResult.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument:
      massIDWithWasteGeneratorInvalidResult.massIDAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has invalid accreditation result event (expired) (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIDWithWasteGeneratorMultipleValid.massIDDocument,
      ...massIDWithWasteGeneratorMultipleValid.participantsAccreditationDocuments.values(),
      wasteGeneratorSecondAccreditation,
    ],
    massIDAuditDocument: createMassIDAuditWithLinkEvent(
      massIDWithWasteGeneratorMultipleValid.massIDAuditDocument,
      wasteGeneratorSecondAccreditation,
    ),
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has multiple valid accreditations (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIDWithParticipantMultipleRoles.massIDDocument,
      ...massIDWithParticipantMultipleRoles.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument: massIDWithParticipantMultipleRoles.massIDAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'participant has one valid accreditation as PROCESSOR and one as RECYCLER (should pass)',
  },
  {
    documents: [
      massIDWithWasteGeneratorButNoAccreditation.massIDDocument,
      ...massIDWithWasteGeneratorButNoAccreditation.participantsAccreditationDocuments.values(),
    ],
    massIDAuditDocument:
      massIDWithWasteGeneratorButNoAccreditation.massIDAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR event exists but no accreditation document provided (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIDWithProcessorMultipleValid.massIDDocument,
      ...massIDWithProcessorMultipleValid.participantsAccreditationDocuments.values(),
      processorSecondAccreditation,
    ],
    massIDAuditDocument: createMassIDAuditWithLinkEvent(
      massIDWithProcessorMultipleValid.massIDAuditDocument,
      processorSecondAccreditation,
    ),
    resultComment:
      processorError.ERROR_MESSAGE.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT(
        processorOriginalAccreditation.primaryParticipant.id,
        PROCESSOR,
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'PROCESSOR has multiple valid accreditations (should fail)',
  },
];
