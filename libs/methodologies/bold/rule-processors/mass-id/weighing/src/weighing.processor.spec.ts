import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
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
        accreditationDocuments,
        massIdDocumentEvents,
        resultComment,
        resultStatus,
      }) => {
        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          accreditationDocuments,
          massIdDocumentsParams: {
            externalEventsMap: massIdDocumentEvents,
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
