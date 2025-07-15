import {
  BoldStubsBuilder,
  stubBoldAccreditationResultEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { subDays } from 'date-fns';

import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';
import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.processor';

const { HAULER } = MassIdDocumentActorType;
const { ACCREDITATION_RESULT } = DocumentEventName;
const { EFFECTIVE_DATE, EXPIRATION_DATE } = DocumentEventAttributeName;

const processorError =
  new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors();

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
        HAULER,
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
      ].filter((document) => document.subtype !== HAULER),
    ],
    massIdAuditDocument:
      massIdAuditWithAccreditationsAndVerifications.massIdAuditDocument,
    resultComment:
      processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
        [HAULER],
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
    resultComment: RESULT_COMMENTS.INVALID_ACCREDITATION_DOCUMENTS([
      massIdWithExpiredAccreditation.participantsAccreditationDocuments.get(
        HAULER,
      )!.id,
    ]),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the participants accreditation documents are found and the accreditation is not active',
  },
];
