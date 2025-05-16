import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { MassSortingProcessor } from './mass-id-sorting.processor';
import {
  massSortingErrorTestCases,
  massSortingTestCases,
} from './mass-id-sorting.test-cases';

describe('MassSortingProcessor', () => {
  const ruleDataProcessor = new MassSortingProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('MassSortingProcessor', () => {
    it.each(massSortingTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        actorParticipants,
        homologationDocuments,
        massIdEvents,
        resultComment,
        resultStatus,
      }) => {
        const {
          massIdAuditDocument,
          massIdDocument,
          participantsHomologationDocuments,
        } = new BoldStubsBuilder({ massIdActorParticipants: actorParticipants })
          .createMassIdDocuments({
            externalEventsMap: massIdEvents,
          })
          .createMassIdAuditDocuments()
          .createMethodologyDocument()
          .createParticipantHomologationDocuments(homologationDocuments)
          .build();

        const allDocuments = [
          massIdDocument,
          massIdAuditDocument,
          ...participantsHomologationDocuments.values(),
        ];

        spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: massIdAuditDocument.id,
        };

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(ruleOutput).toEqual({
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultStatus,
        });
      },
    );
  });

  describe('MassSortingProcessorErrors', () => {
    it.each(massSortingErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIdAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIdAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: massIdAuditDocument.id,
        };

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(ruleOutput).toEqual({
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultStatus,
        });
      },
    );
  });
});
