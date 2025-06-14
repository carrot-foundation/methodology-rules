import {
  expectRuleOutput,
  createRuleTestFixture,
  spyOnDocumentQueryServiceLoad,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { MassIdSortingProcessor } from './mass-id-sorting.processor';
import {
  massIdSortingErrorTestCases,
  massIdSortingTestCases,
} from './mass-id-sorting.test-cases';

describe('MassIdSortingProcessor', () => {
  const ruleDataProcessor = new MassIdSortingProcessor();

  describe('MassIdSortingProcessor', () => {
    it.each(massIdSortingTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        actorParticipants,
        homologationDocuments,
        massIdEvents,
        resultComment,
        resultStatus,
      }) => {
        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          homologationDocuments,
          massIdActorParticipants: actorParticipants,
          massIdDocumentsParams: {
            externalEventsMap: massIdEvents,
          },
          ruleDataProcessor,
        });

        expectRuleOutput({
          resultComment,
          resultStatus,
          ruleInput,
          ruleOutput,
        });
      },
    );
  });

  describe('MassIdSortingProcessorErrors', () => {
    it.each(massIdSortingErrorTestCases)(
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
