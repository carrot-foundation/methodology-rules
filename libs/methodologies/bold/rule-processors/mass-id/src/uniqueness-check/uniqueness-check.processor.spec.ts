import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
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

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const mockCheckDuplicateDocuments = jest.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('./uniqueness-check.helpers', () => ({
  ...jest.requireActual('./uniqueness-check.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('UniquenessCheckProcessor Rule', () => {
  const ruleDataProcessor = new UniquenessCheckProcessor();
  const documentLoaderService = jest.mocked(loadDocument);

  describe('UniquenessCheckProcessor', () => {
    it.each(uniquenessCheckTestCases)(
      `should return $resultStatus when $scenario`,
      async ({
        newDuplicateDocuments,
        oldDuplicateDocuments,
        resultComment,
        resultStatus,
      }) => {
        const ruleInput = random<Required<RuleInput>>();

        const { massIdDocument } = new BoldStubsBuilder()
          .createMassIdDocuments()
          .build();

        mockCheckDuplicateDocuments
          .mockResolvedValueOnce(newDuplicateDocuments)
          .mockResolvedValueOnce(oldDuplicateDocuments);

        documentLoaderService.mockResolvedValueOnce(massIdDocument);

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

  describe('UniquenessCheckProcessor Errors', () => {
    it.each(uniquenessCheckErrorTestCases)(
      `should return $resultStatus when $scenario`,
      async ({ massIdDocument, resultComment, resultStatus }) => {
        const ruleInput = random<Required<RuleInput>>();

        documentLoaderService.mockResolvedValueOnce(massIdDocument);

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
});
