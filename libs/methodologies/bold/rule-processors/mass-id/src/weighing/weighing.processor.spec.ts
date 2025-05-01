import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { WeighingProcessor } from './weighing.processor';
import {
  weighingErrorTestCases,
  weighingTestCases,
} from './weighing.test-cases';

describe('WeighingProcessor', () => {
  const ruleDataProcessor = new WeighingProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('WeighingProcessor', () => {
    it.each(weighingTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        homologationDocuments,
        massIdDocumentEvents,
        resultComment,
        resultStatus,
      }) => {
        const {
          massIdAuditDocument,
          massIdDocument,
          participantsHomologationDocuments,
        } = new BoldStubsBuilder()
          .createMassIdDocuments({
            externalEventsMap: massIdDocumentEvents,
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

  describe('WeighingProcessorErrors', () => {
    it.each(weighingErrorTestCases)(
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
