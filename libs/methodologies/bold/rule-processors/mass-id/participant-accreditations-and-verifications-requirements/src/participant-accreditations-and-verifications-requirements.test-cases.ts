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
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { addDays, subDays } from 'date-fns';

import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';
import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.processor';

const { HAULER, INTEGRATOR, PROCESSOR, RECYCLER, WASTE_GENERATOR } =
  MassIdDocumentActorType;
const { ACCREDITATION_CONTEXT, ACCREDITATION_RESULT, LINK } = DocumentEventName;
const { ACCREDITATION_STATUS, EFFECTIVE_DATE, EXPIRATION_DATE } =
  DocumentEventAttributeName;

const processorError =
  new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors();

const createMultipleValidAccreditationsTestData = (
  actorType: MassIdDocumentActorType,
) => {
  const massIdWithMultipleValid = new BoldStubsBuilder()
    .createMassIdDocuments()
    .createMassIdAuditDocuments()
    .createMethodologyDocument()
    .createParticipantAccreditationDocuments(
      new Map([
        [
          actorType,
          {
            externalEventsMap: new Map([
              [
                ACCREDITATION_RESULT,
                stubBoldAccreditationResultEvent({
                  metadataAttributes: [
                    [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                    [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                    [
                      ACCREDITATION_STATUS,
                      DocumentEventAccreditationStatus.APPROVED,
                    ],
                  ],
                }),
              ],
            ]),
          },
        ],
      ]),
    )
    .build();

  const originalAccreditation =
    massIdWithMultipleValid.participantsAccreditationDocuments.get(actorType)!;

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
    massIdWithMultipleValid,
    originalAccreditation,
    secondAccreditation,
  };
};

const massIdAuditWithAccreditationsAndVerifications = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

const massIdWithExpiredAccreditation = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments(
    new Map([
      [
        INTEGRATOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, subDays(new Date(), 2).toISOString()],
                ],
              }),
            ],
          ]),
        },
      ],
    ]),
  )
  .build();

const massIdWithWasteGeneratorNoResult = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments(
    new Map([
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: new Map([
            // Only ACCREDITATION_CONTEXT, no ACCREDITATION_RESULT
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
  )
  .build();

const massIdWithWasteGeneratorValidResult = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments(
    new Map([
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
          ]),
        },
      ],
    ]),
  )
  .build();

const massIdWithWasteGeneratorInvalidResult = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments(
    new Map([
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, subDays(new Date(), 2).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
          ]),
        },
      ],
    ]),
  )
  .build();

const {
  massIdWithMultipleValid: massIdWithWasteGeneratorMultipleValid,
  secondAccreditation: wasteGeneratorSecondAccreditation,
} = createMultipleValidAccreditationsTestData(WASTE_GENERATOR);

const {
  massIdWithMultipleValid: massIdWithProcessorMultipleValid,
  originalAccreditation: processorOriginalAccreditation,
  secondAccreditation: processorSecondAccreditation,
} = createMultipleValidAccreditationsTestData(PROCESSOR);

// Create a participant that has both PROCESSOR and RECYCLER roles
const sharedParticipant = stubParticipant({ type: PROCESSOR });

const massIdWithParticipantMultipleRoles = new BoldStubsBuilder({
  massIdActorParticipants: new Map([
    [HAULER, stubParticipant({ type: HAULER })],
    [INTEGRATOR, stubParticipant({ type: INTEGRATOR })],
    [PROCESSOR, sharedParticipant],
    [RECYCLER, sharedParticipant],
    [WASTE_GENERATOR, stubParticipant({ type: WASTE_GENERATOR })],
  ]),
})
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments(
    new Map([
      [
        INTEGRATOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
          ]),
        },
      ],
      [
        PROCESSOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
          ]),
        },
      ],
      [
        RECYCLER,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
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
  )
  .build();

const massIdWithWasteGeneratorButNoAccreditation = new BoldStubsBuilder({
  massIdActorParticipants: new Map([
    [INTEGRATOR, stubParticipant({ type: INTEGRATOR })],
    [PROCESSOR, stubParticipant({ type: PROCESSOR })],
    [RECYCLER, stubParticipant({ type: RECYCLER })],
    [WASTE_GENERATOR, stubParticipant({ type: WASTE_GENERATOR })],
  ]),
})
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments(
    new Map([
      [
        INTEGRATOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
          ]),
        },
      ],
      [
        PROCESSOR,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
          ]),
        },
      ],
      [
        RECYCLER,
        {
          externalEventsMap: new Map([
            [
              ACCREDITATION_RESULT,
              stubBoldAccreditationResultEvent({
                metadataAttributes: [
                  [EFFECTIVE_DATE, subDays(new Date(), 10).toISOString()],
                  [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
                  [
                    ACCREDITATION_STATUS,
                    DocumentEventAccreditationStatus.APPROVED,
                  ],
                ],
              }),
            ],
          ]),
        },
      ],
    ]),
  )
  .build();

export const participantAccreditationsAndVerificationsRequirementsTestCases = [
  {
    documents: [
      massIdAuditWithAccreditationsAndVerifications.massIdDocument,
      ...massIdAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument:
      massIdAuditWithAccreditationsAndVerifications.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the participants accreditation documents are found and the accreditation is active',
  },
  {
    documents: [massIdAuditWithAccreditationsAndVerifications.massIdDocument],
    massIdAuditDocument:
      massIdAuditWithAccreditationsAndVerifications.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.ACCREDITATION_DOCUMENTS_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the participants accreditation documents are not found',
  },
  {
    documents: [
      massIdAuditWithAccreditationsAndVerifications.massIdDocument,
      ...[
        ...massIdAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
      ].filter((document) => document.subtype !== INTEGRATOR),
    ],
    massIdAuditDocument:
      massIdAuditWithAccreditationsAndVerifications.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
        [INTEGRATOR],
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'some participants accreditation documents are not found',
  },
  {
    documents: [
      ...massIdAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument:
      massIdAuditWithAccreditationsAndVerifications.massIdAuditDocument,
    resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the mass document does not exist',
  },
  {
    documents: [
      {
        ...massIdAuditWithAccreditationsAndVerifications.massIdDocument,
        externalEvents: [],
      },
      ...massIdAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument:
      massIdAuditWithAccreditationsAndVerifications.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
        massIdAuditWithAccreditationsAndVerifications.massIdDocument.id,
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the mass document does not contain events',
  },
  {
    documents: [
      massIdWithExpiredAccreditation.massIdDocument,
      ...massIdWithExpiredAccreditation.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument: massIdWithExpiredAccreditation.massIdAuditDocument,
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
      massIdWithWasteGeneratorNoResult.massIdDocument,
      ...massIdWithWasteGeneratorNoResult.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument: massIdWithWasteGeneratorNoResult.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has accreditation document without result event (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIdWithWasteGeneratorValidResult.massIdDocument,
      ...massIdWithWasteGeneratorValidResult.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument:
      massIdWithWasteGeneratorValidResult.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has valid accreditation result event (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIdWithWasteGeneratorInvalidResult.massIdDocument,
      ...massIdWithWasteGeneratorInvalidResult.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument:
      massIdWithWasteGeneratorInvalidResult.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has invalid accreditation result event (expired) (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIdWithWasteGeneratorMultipleValid.massIdDocument,
      ...massIdWithWasteGeneratorMultipleValid.participantsAccreditationDocuments.values(),
      wasteGeneratorSecondAccreditation,
    ],
    // Add LINK event to mass ID audit document referencing second accreditation
    massIdAuditDocument: {
      ...massIdWithWasteGeneratorMultipleValid.massIdAuditDocument,
      externalEvents: [
        ...(massIdWithWasteGeneratorMultipleValid.massIdAuditDocument
          .externalEvents ?? []),
        stubDocumentEvent({
          name: LINK,
          relatedDocument: {
            ...mapDocumentRelation(wasteGeneratorSecondAccreditation),
            bidirectional: false,
          },
        }),
      ],
    },
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR has multiple valid accreditations (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIdWithParticipantMultipleRoles.massIdDocument,
      ...massIdWithParticipantMultipleRoles.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument: massIdWithParticipantMultipleRoles.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'participant has one valid accreditation as PROCESSOR and one as RECYCLER (should pass)',
  },
  {
    documents: [
      massIdWithWasteGeneratorButNoAccreditation.massIdDocument,
      ...massIdWithWasteGeneratorButNoAccreditation.participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument:
      massIdWithWasteGeneratorButNoAccreditation.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'WASTE_GENERATOR event exists but no accreditation document provided (should pass - Waste Generator is ignored)',
  },
  {
    documents: [
      massIdWithProcessorMultipleValid.massIdDocument,
      ...massIdWithProcessorMultipleValid.participantsAccreditationDocuments.values(),
      processorSecondAccreditation,
    ],
    // Add LINK event to mass ID audit document referencing second accreditation
    massIdAuditDocument: {
      ...massIdWithProcessorMultipleValid.massIdAuditDocument,
      externalEvents: [
        ...(massIdWithProcessorMultipleValid.massIdAuditDocument
          .externalEvents ?? []),
        stubDocumentEvent({
          name: LINK,
          relatedDocument: {
            ...mapDocumentRelation(processorSecondAccreditation),
            bidirectional: false,
          },
        }),
      ],
    },
    resultComment:
      processorError.ERROR_MESSAGE.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT(
        processorOriginalAccreditation.primaryParticipant.id,
        PROCESSOR,
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'PROCESSOR has multiple valid accreditations (should fail)',
  },
];
