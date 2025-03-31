import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { UniquenessCheckProcessor } from './uniqueness-check.processor';
import {
  uniquenessCheckErrorTestCases,
  uniquenessCheckTestCases,
} from './uniqueness-check.test-cases';

const mockCheckDuplicateDocuments = jest.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('./uniqueness-check.helpers', () => ({
  ...jest.requireActual('./uniqueness-check.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('Uniqueness Check Processor', () => {
  const ruleDataProcessor = new UniquenessCheckProcessor();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UniquenessCheckProcessor', () => {
    it.each(uniquenessCheckTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        newDuplicateDocuments,
        oldDuplicateDocuments,
        resultComment,
        resultStatus,
      }) => {
        const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
          .createMassIdDocument()
          .createMassIdAuditDocument()
          .build();

        spyOnDocumentQueryServiceLoad(massIdAuditDocument, [
          massIdAuditDocument,
          massIdDocument,
        ]);

        mockCheckDuplicateDocuments
          .mockResolvedValueOnce(newDuplicateDocuments)
          .mockResolvedValueOnce(oldDuplicateDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: massIdAuditDocument.id,
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

  describe('UniquenessCheckProcessorErrors', () => {
    it.each(uniquenessCheckErrorTestCases)(
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
