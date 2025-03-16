import {
  BoldStubsBuilder,
  stubBoldHomologationDocumentCloseEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventName,
  MassIdDocumentActorType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { formatDate, subDays } from 'date-fns';

import { CheckParticipantsHomologationProcessorErrors } from './check-participants-homologation.errors';
import { RESULT_COMMENTS } from './check-participants-homologation.processor';

const { HAULER } = MassIdDocumentActorType;
const { CLOSE } = DocumentEventName;
const { HOMOLOGATION_DATE, HOMOLOGATION_DUE_DATE } =
  NewDocumentEventAttributeName;

const processorError = new CheckParticipantsHomologationProcessorErrors();

const massIdAuditWithHomologations = new BoldStubsBuilder()
  .createMassIdDocumentStub()
  .createMassIdAuditDocumentStub()
  .createMethodologyDocuments()
  .createParticipantHomologationDocuments()
  .build();

const massIdWithExpiredHomologation = new BoldStubsBuilder()
  .createMassIdDocumentStub()
  .createMassIdAuditDocumentStub()
  .createMethodologyDocuments()
  .createParticipantHomologationDocuments(
    new Map([
      [
        HAULER,
        {
          externalEventsMap: new Map([
            [
              CLOSE,
              stubBoldHomologationDocumentCloseEvent({
                metadataAttributes: [
                  [
                    HOMOLOGATION_DATE,
                    formatDate(subDays(new Date(), 10), 'yyyy-MM-dd'),
                  ],
                  [
                    HOMOLOGATION_DUE_DATE,
                    formatDate(subDays(new Date(), 2), 'yyyy-MM-dd'),
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

export const checkParticipantsHomologationTestCases = [
  {
    documents: [
      massIdAuditWithHomologations.massIdDocumentStub,
      ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
    ],
    massIdAuditDocumentStub:
      massIdAuditWithHomologations.massIdAuditDocumentStub,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'the participants homologation documents are found and the homologation is active',
  },
  {
    documents: [massIdAuditWithHomologations.massIdDocumentStub],
    massIdAuditDocumentStub:
      massIdAuditWithHomologations.massIdAuditDocumentStub,
    resultComment:
      processorError.ERROR_MESSAGE.HOMOLOGATION_DOCUMENTS_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the participants homologation documents are not found',
  },
  {
    documents: [
      massIdAuditWithHomologations.massIdDocumentStub,
      ...[
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
      ].filter((document) => document.subtype !== HAULER),
    ],
    massIdAuditDocumentStub:
      massIdAuditWithHomologations.massIdAuditDocumentStub,
    resultComment:
      processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS([
        HAULER,
      ]),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'some participants homologation documents are not found',
  },
  {
    documents: [
      ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
    ],
    massIdAuditDocumentStub:
      massIdAuditWithHomologations.massIdAuditDocumentStub,
    resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the mass document does not exist',
  },
  {
    documents: [
      {
        ...massIdAuditWithHomologations.massIdDocumentStub,
        externalEvents: [],
      },
      ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
    ],
    massIdAuditDocumentStub:
      massIdAuditWithHomologations.massIdAuditDocumentStub,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
        massIdAuditWithHomologations.massIdDocumentStub.id,
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the mass document does not contain events',
  },
  {
    documents: [
      massIdWithExpiredHomologation.massIdDocumentStub,
      ...massIdWithExpiredHomologation.participantsHomologationDocumentStubs.values(),
    ],
    massIdAuditDocumentStub:
      massIdWithExpiredHomologation.massIdAuditDocumentStub,
    resultComment: processorError.ERROR_MESSAGE.HOMOLOGATION_EXPIRED([
      massIdWithExpiredHomologation.participantsHomologationDocumentStubs.get(
        HAULER,
      )!.id,
    ]),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'the participants homologation documents are found and the homologation is not active',
  },
];
