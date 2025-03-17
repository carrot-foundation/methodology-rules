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
  .createMassIdDocument()
  .createMassIdAuditDocument()
  .createMethodologyDocuments()
  .createParticipantHomologationDocuments()
  .build();

const massIdWithExpiredHomologation = new BoldStubsBuilder()
  .createMassIdDocument()
  .createMassIdAuditDocument()
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
      massIdAuditWithHomologations.massIdDocument,
      ...massIdAuditWithHomologations.participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'the participants homologation documents are found and the homologation is active',
  },
  {
    documents: [massIdAuditWithHomologations.massIdDocument],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.HOMOLOGATION_DOCUMENTS_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the participants homologation documents are not found',
  },
  {
    documents: [
      massIdAuditWithHomologations.massIdDocument,
      ...[
        ...massIdAuditWithHomologations.participantsHomologationDocuments.values(),
      ].filter((document) => document.subtype !== HAULER),
    ],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS([
        HAULER,
      ]),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'some participants homologation documents are not found',
  },
  {
    documents: [
      ...massIdAuditWithHomologations.participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the mass document does not exist',
  },
  {
    documents: [
      {
        ...massIdAuditWithHomologations.massIdDocument,
        externalEvents: [],
      },
      ...massIdAuditWithHomologations.participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
        massIdAuditWithHomologations.massIdDocument.id,
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the mass document does not contain events',
  },
  {
    documents: [
      massIdWithExpiredHomologation.massIdDocument,
      ...massIdWithExpiredHomologation.participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument: massIdWithExpiredHomologation.massIdAuditDocument,
    resultComment: processorError.ERROR_MESSAGE.HOMOLOGATION_EXPIRED([
      massIdWithExpiredHomologation.participantsHomologationDocuments.get(
        HAULER,
      )!.id,
    ]),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'the participants homologation documents are found and the homologation is not active',
  },
];
