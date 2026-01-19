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
        massIDDocumentValue,
        resultComment,
        resultContent,
        resultStatus,
        subtype,
      }) => {
        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          accreditationDocuments,
          massIDDocumentsParams: {
            partialDocument: {
              currentValue: massIDDocumentValue as number,
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
