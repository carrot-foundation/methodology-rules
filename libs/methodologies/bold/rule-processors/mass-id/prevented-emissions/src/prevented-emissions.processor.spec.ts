import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { PreventedEmissionsProcessor } from './prevented-emissions.processor';
import {
  preventedEmissionsErrorTestCases,
  preventedEmissionsTestCases,
} from './prevented-emissions.test-cases';

describe('PreventedEmissionsProcessor', () => {
  const ruleDataProcessor = new PreventedEmissionsProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('PreventedEmissionsProcessor', () => {
    it.each(preventedEmissionsTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        accreditationDocuments,
        externalCreatedAt,
        massIdDocumentValue,
        resultComment,
        resultContent,
        resultStatus,
        subtype,
      }) => {
        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          accreditationDocuments,
          massIdDocumentsParams: {
            partialDocument: {
              currentValue: massIdDocumentValue as number,
              externalCreatedAt,
              subtype,
            },
          },
          ruleDataProcessor,
          spyOnDocumentQueryServiceLoad,
        });

        expectRuleOutput({
          resultComment,
          resultContent,
          resultStatus,
          ruleInput,
          ruleOutput,
        });
      },
    );
  });

  describe('PreventedEmissionsProcessorErrors', () => {
    it.each(preventedEmissionsErrorTestCases)(
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
