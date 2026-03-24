import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  BoldStubsBuilder,
  stubBoldAccreditationResultEvent,
  stubDocument,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  type DocumentEventName,
  type MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { addDays, subDays } from 'date-fns';

import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.constants';
import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';

const processorError =
  new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors();

const createValidAccreditationResultEvent = () =>
  stubBoldAccreditationResultEvent({
    metadataAttributes: [
      ['Effective Date', subDays(new Date(), 10).toISOString()],
      ['Expiration Date', addDays(new Date(), 10).toISOString()],
      ['Accreditation Status', 'Approved'],
    ],
  });

const createExpiredAccreditationResultEvent = () =>
  stubBoldAccreditationResultEvent({
    metadataAttributes: [
      ['Effective Date', subDays(new Date(), 10).toISOString()],
      ['Expiration Date', subDays(new Date(), 2).toISOString()],
      ['Accreditation Status', 'Approved'],
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
      name: 'LINK',
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
              ['Accreditation Result', createValidAccreditationResultEvent()],
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
      category: 'Methodology',
      externalEvents: [
        stubBoldAccreditationResultEvent({
          metadataAttributes: [
            ['Effective Date', subDays(new Date(), 5).toISOString()],
            ['Expiration Date', addDays(new Date(), 5).toISOString()],
            ['Accreditation Status', 'Approved'],
          ],
        }),
      ],
      primaryParticipant: originalAccreditation.primaryParticipant,
      subtype: actorType,
      type: 'Participant Accreditation',
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
  'Integrator',
  new Map([['Accreditation Result', createExpiredAccreditationResultEvent()]]),
);

const massIDWithWasteGeneratorNoResult = createMassIDWithActorAccreditation(
  'Waste Generator',
  new Map([
    [
      'Accreditation Context',
      stubDocumentEvent({
        name: 'Accreditation Context',
      }),
    ],
  ]),
);

const massIDWithWasteGeneratorValidResult = createMassIDWithActorAccreditation(
  'Waste Generator',
  new Map([['Accreditation Result', createValidAccreditationResultEvent()]]),
);

const massIDWithWasteGeneratorInvalidResult =
  createMassIDWithActorAccreditation(
    'Waste Generator',
    new Map([
      ['Accreditation Result', createExpiredAccreditationResultEvent()],
    ]),
  );

const {
  massIDWithMultipleValid: massIDWithWasteGeneratorMultipleValid,
  secondAccreditation: wasteGeneratorSecondAccreditation,
} = createMultipleValidAccreditationsTestData('Waste Generator');

const {
  massIDWithMultipleValid: massIDWithProcessorMultipleValid,
  originalAccreditation: processorOriginalAccreditation,
  secondAccreditation: processorSecondAccreditation,
} = createMultipleValidAccreditationsTestData('Processor');

// Create a participant that has both PROCESSOR and RECYCLER roles
const sharedParticipant = stubParticipant({ type: 'Processor' });

const massIDWithParticipantMultipleRoles =
  createMassIDWithMultipleActorAccreditations(
    new Map([
      [
        'Integrator',
        {
          externalEventsMap: new Map([
            ['Accreditation Result', createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        'Processor',
        {
          externalEventsMap: new Map([
            ['Accreditation Result', createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        'Recycler',
        {
          externalEventsMap: new Map([
            ['Accreditation Result', createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        'Waste Generator',
        {
          externalEventsMap: new Map([
            [
              'Accreditation Context',
              stubDocumentEvent({
                name: 'Accreditation Context',
              }),
            ],
          ]),
        },
      ],
    ]),
    new Map([
      ['Hauler', stubParticipant({ type: 'Hauler' })],
      ['Integrator', stubParticipant({ type: 'Integrator' })],
      ['Processor', sharedParticipant],
      ['Recycler', sharedParticipant],
      ['Waste Generator', stubParticipant({ type: 'Waste Generator' })],
    ]),
  );

const massIDWithWasteGeneratorButNoAccreditation =
  createMassIDWithMultipleActorAccreditations(
    new Map([
      [
        'Integrator',
        {
          externalEventsMap: new Map([
            ['Accreditation Result', createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        'Processor',
        {
          externalEventsMap: new Map([
            ['Accreditation Result', createValidAccreditationResultEvent()],
          ]),
        },
      ],
      [
        'Recycler',
        {
          externalEventsMap: new Map([
            ['Accreditation Result', createValidAccreditationResultEvent()],
          ]),
        },
      ],
    ]),
    new Map([
      ['Integrator', stubParticipant({ type: 'Integrator' })],
      ['Processor', stubParticipant({ type: 'Processor' })],
      ['Recycler', stubParticipant({ type: 'Recycler' })],
      ['Waste Generator', stubParticipant({ type: 'Waste Generator' })],
    ]),
  );

interface ParticipantAccreditationsTestCase extends RuleTestCase {
  documents: Document[];
  massIDAuditDocument: Document;
}

export const participantAccreditationsAndVerificationsRequirementsTestCases: ParticipantAccreditationsTestCase[] =
  [
    {
      documents: [
        massIDAuditWithAccreditationsAndVerifications.massIDDocument,
        ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument:
        massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        "The participants' accreditation documents exist and the accreditation is active",
    },
    {
      documents: [massIDAuditWithAccreditationsAndVerifications.massIDDocument],
      massIDAuditDocument:
        massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE.ACCREDITATION_DOCUMENTS_NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: "The participants' accreditation documents were not found",
    },
    {
      documents: [
        massIDAuditWithAccreditationsAndVerifications.massIDDocument,
        ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument:
        massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        "The participants' accreditation documents exist and the accreditation is active",
    },
    {
      documents: [massIDAuditWithAccreditationsAndVerifications.massIDDocument],
      massIDAuditDocument:
        massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE.ACCREDITATION_DOCUMENTS_NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: "The participants' accreditation documents were not found",
    },
    {
      documents: [
        massIDAuditWithAccreditationsAndVerifications.massIDDocument,
        ...[
          ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
        ].filter((document) => document.subtype !== 'Integrator'),
      ],
      massIDAuditDocument:
        massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
          ['Integrator'],
        ),
      resultStatus: 'FAILED',
      scenario: "Some participants' accreditation documents were not found",
    },
    {
      documents: [
        ...massIDAuditWithAccreditationsAndVerifications.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument:
        massIDAuditWithAccreditationsAndVerifications.massIDAuditDocument,
      resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: 'The MassID document does not exist',
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
      resultStatus: 'FAILED',
      scenario: 'The MassID document does not contain events',
    },
    {
      documents: [
        massIDWithExpiredAccreditation.massIDDocument,
        ...massIDWithExpiredAccreditation.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument: massIDWithExpiredAccreditation.massIDAuditDocument,
      resultComment:
        processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
          ['Integrator'],
        ),
      resultStatus: 'FAILED',
      scenario:
        "The participants' accreditation documents exist and the accreditation is not active",
    },
    {
      documents: [
        massIDWithWasteGeneratorNoResult.massIDDocument,
        ...massIDWithWasteGeneratorNoResult.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument: massIDWithWasteGeneratorNoResult.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        'The WASTE_GENERATOR has an accreditation document without a result event (should pass - Waste Generator is ignored)',
    },
    {
      documents: [
        massIDWithWasteGeneratorValidResult.massIDDocument,
        ...massIDWithWasteGeneratorValidResult.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument:
        massIDWithWasteGeneratorValidResult.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        'The WASTE_GENERATOR has a valid accreditation result event (should pass - Waste Generator is ignored)',
    },
    {
      documents: [
        massIDWithWasteGeneratorInvalidResult.massIDDocument,
        ...massIDWithWasteGeneratorInvalidResult.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument:
        massIDWithWasteGeneratorInvalidResult.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        'The WASTE_GENERATOR has an invalid accreditation result event (expired) (should pass - Waste Generator is ignored)',
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
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        'The WASTE_GENERATOR has multiple valid accreditations (should pass - Waste Generator is ignored)',
    },
    {
      documents: [
        massIDWithParticipantMultipleRoles.massIDDocument,
        ...massIDWithParticipantMultipleRoles.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument:
        massIDWithParticipantMultipleRoles.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        'The participant has one valid accreditation as PROCESSOR and one as RECYCLER (should pass)',
    },
    {
      documents: [
        massIDWithWasteGeneratorButNoAccreditation.massIDDocument,
        ...massIDWithWasteGeneratorButNoAccreditation.participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument:
        massIDWithWasteGeneratorButNoAccreditation.massIDAuditDocument,
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
      scenario:
        'The WASTE_GENERATOR event exists but no accreditation document provided (should pass - Waste Generator is ignored)',
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
          'Processor',
        ),
      resultStatus: 'FAILED',
      scenario:
        'The MassID document has a PROCESSOR with multiple valid accreditations (should fail)',
    },
  ];
