import {
  BoldStubsBuilder,
  stubBoldHomologationResultEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { subDays } from 'date-fns';

import { ParticipantHomologationsProcessorErrors } from './participant-homologations.errors';
import { RESULT_COMMENTS } from './participant-homologations.processor';

const { HAULER } = MassIdDocumentActorType;
const { HOMOLOGATION_RESULT } = DocumentEventName;
const { EFFECTIVE_DATE, EXPIRATION_DATE } = DocumentEventAttributeName;

const processorError = new ParticipantHomologationsProcessorErrors();

const massIdAuditWithHomologations = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantHomologationDocuments()
  .build();

const massIdWithExpiredHomologation = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantHomologationDocuments(
    new Map([
      [
        HAULER,
        {
          externalEventsMap: new Map([
            [
              HOMOLOGATION_RESULT,
              stubBoldHomologationResultEvent({
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

export const participantHomologationsTestCases = [
  {
    documents: [
      massIdAuditWithHomologations.massIdDocument,
      ...massIdAuditWithHomologations.participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the participants homologation documents are found and the homologation is active',
  },
  {
    documents: [massIdAuditWithHomologations.massIdDocument],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.HOMOLOGATION_DOCUMENTS_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
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
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'some participants homologation documents are not found',
  },
  {
    documents: [
      ...massIdAuditWithHomologations.participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument: massIdAuditWithHomologations.massIdAuditDocument,
    resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
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
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the mass document does not contain events',
  },
  {
    documents: [
      massIdWithExpiredHomologation.massIdDocument,
      ...massIdWithExpiredHomologation.participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument: massIdWithExpiredHomologation.massIdAuditDocument,
    resultComment: RESULT_COMMENTS.INVALID_HOMOLOGATION_DOCUMENTS([
      massIdWithExpiredHomologation.participantsHomologationDocuments.get(
        HAULER,
      )!.id,
    ]),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the participants homologation documents are found and the homologation is not active',
  },
];
