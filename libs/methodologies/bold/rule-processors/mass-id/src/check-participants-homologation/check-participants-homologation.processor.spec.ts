import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { CheckParticipantsHomologationProcessorErrors } from './check-participants-homologation.errors';
import { CheckParticipantsHomologationProcessor } from './check-participants-homologation.processor';
import { createCheckParticipantsHomologationTestData } from './check-participants-homologation.stubs';

describe('CheckParticipantsHomologationProcessor', () => {
  const ruleDataProcessor = new CheckParticipantsHomologationProcessor();
  const processorError = new CheckParticipantsHomologationProcessorErrors();

  const {
    expiredParticipantHomologationDocumentStub,
    massAuditDocumentStub,
    massAuditId,
    massDocumentStub,
    massWithExpiredHomologationStub,
    massWithNoEventsStub,
    massWithSourceParticipantStub,
    participantsHomologationDocumentStubs,
    sourceParticipantEvent,
  } = createCheckParticipantsHomologationTestData({
    includeExpiredHomologation: true,
  });

  it.each([
    {
      documents: [
        massDocumentStub,
        ...participantsHomologationDocumentStubs.values(),
      ],
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when the participants homologation documents are found and the homologation is in force',
    },
    {
      documents: [
        massWithExpiredHomologationStub as Document,
        ...participantsHomologationDocumentStubs.values(),
        expiredParticipantHomologationDocumentStub as Document,
      ],
      resultComment: processorError.ERROR_MESSAGE.HOMOLOGATION_EXPIRED([
        (expiredParticipantHomologationDocumentStub as Document).id,
      ]),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are found and the homologation is not in force',
    },
    {
      documents: [massDocumentStub],
      resultComment:
        processorError.ERROR_MESSAGE.HOMOLOGATION_DOCUMENTS_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are not found',
    },
    {
      documents: [
        massWithSourceParticipantStub,
        ...participantsHomologationDocumentStubs.values(),
      ],
      resultComment:
        processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS(
          [sourceParticipantEvent.name],
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when some participants homologation documents are not found',
    },
    {
      documents: [...participantsHomologationDocumentStubs.values()],
      resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when the mass document does not exist',
    },
    {
      documents: [
        massWithNoEventsStub,
        ...participantsHomologationDocumentStubs.values(),
      ],
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          massDocumentStub.id,
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the mass document does not contain events',
    },
  ])('$scenario', async ({ documents, resultComment, resultStatus }) => {
    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massAuditDocumentStub,
      ...documents,
    ]);

    const ruleInput = {
      ...random<Required<RuleInput>>(),
      documentId: massAuditId,
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
  });
});
