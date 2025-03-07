import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { formatDate, subDays } from 'date-fns';
import { random } from 'typia';

import { CheckParticipantsHomologationProcessorErrors } from './check-participants-homologation.errors';
import { CheckParticipantsHomologationProcessor } from './check-participants-homologation.processor';

const { ACTOR, CLOSE } = DocumentEventName;
const { HAULER } = DocumentSubtype;
const { HOMOLOGATION_DATE, HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

describe('CheckParticipantsHomologationProcessor', () => {
  const ruleDataProcessor = new CheckParticipantsHomologationProcessor();
  const processorError = new CheckParticipantsHomologationProcessorErrors();

  const massIdAuditWithHomologations = new BoldStubsBuilder()
    .createMethodologyDocuments()
    .createParticipantHomologationDocuments()
    .build();
  const massIdAuditWithoutHomologations = new BoldStubsBuilder().build();

  const expiredEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [
      [HOMOLOGATION_DATE, formatDate(subDays(new Date(), 10), 'yyyy-MM-dd')],
      [HOMOLOGATION_DUE_DATE, formatDate(subDays(new Date(), 2), 'yyyy-MM-dd')],
    ],
  );

  it.each([
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when the participants homologation documents are found and the homologation is active',
    },
    {
      documents: [massIdAuditWithoutHomologations.massIdDocumentStub],
      massIdAuditDocumentStub:
        massIdAuditWithoutHomologations.massIdAuditDocumentStub,
      resultComment:
        processorError.ERROR_MESSAGE.HOMOLOGATION_DOCUMENTS_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are not found',
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
        processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS(
          // TODO: update to use the event name label instead of the event name
          [ACTOR],
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when some participants homologation documents are not found',
    },
    {
      documents: [
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when the mass document does not exist',
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
      scenario:
        'should return REJECTED when the mass document does not contain events',
    },
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs
          .set(HAULER, {
            ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.get(
              HAULER,
            )!,
            externalEvents: [expiredEvent],
          })
          .values(),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultComment: processorError.ERROR_MESSAGE.HOMOLOGATION_EXPIRED([
        massIdAuditWithHomologations.participantsHomologationDocumentStubs.get(
          HAULER,
        )!.id,
      ]),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are found and the homologation is not active',
    },
  ])(
    '$scenario',
    async ({
      documents,
      massIdAuditDocumentStub,
      resultComment,
      resultStatus,
    }) => {
      spyOnDocumentQueryServiceLoad(stubDocument(), [
        massIdAuditDocumentStub,
        ...documents,
      ]);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocumentStub.id,
      };

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
