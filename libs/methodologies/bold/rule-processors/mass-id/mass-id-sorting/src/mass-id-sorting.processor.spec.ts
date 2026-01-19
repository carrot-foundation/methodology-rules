import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { MassIDSortingProcessor } from './mass-id-sorting.processor';
import {
  massIDSortingErrorTestCases,
  massIDSortingTestCases,
} from './mass-id-sorting.test-cases';

describe('MassIDSortingProcessor', () => {
  const ruleDataProcessor = new MassIDSortingProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('MassIDSortingProcessor', () => {
    it.each(massIDSortingTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        accreditationDocuments,
        actorParticipants,
        massIDEvents,
        partialDocument,
        resultComment,
        resultStatus,
      }) => {
        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          accreditationDocuments,
          massIDActorParticipants: actorParticipants,
          massIDDocumentsParams: {
            externalEventsMap: massIDEvents,
            partialDocument,
          },
          ruleDataProcessor,
          spyOnDocumentQueryServiceLoad,
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

  describe('MassIDSortingProcessorErrors', () => {
    it.each(massIDSortingErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIDAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIDAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: massIDAuditDocument.id,
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
