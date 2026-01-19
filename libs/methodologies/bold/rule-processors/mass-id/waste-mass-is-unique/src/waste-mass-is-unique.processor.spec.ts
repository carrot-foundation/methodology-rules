import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { WasteMassIsUniqueProcessor } from './waste-mass-is-unique.processor';
import {
  wasteMassIsUniqueErrorTestCases,
  wasteMassIsUniqueTestCases,
} from './waste-mass-is-unique.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const mockCheckDuplicateDocuments = jest.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('./waste-mass-is-unique.helpers', () => ({
  ...jest.requireActual('./waste-mass-is-unique.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('WasteMassIsUniqueProcessor Rule', () => {
  const ruleDataProcessor = new WasteMassIsUniqueProcessor();
  const documentLoaderService = jest.mocked(loadDocument);

  describe('WasteMassIsUniqueProcessor', () => {
    it.each(wasteMassIsUniqueTestCases)(
      `should return $resultStatus when $scenario`,
      async ({
        newDuplicateDocuments,
        oldDuplicateDocuments,
        resultComment,
        resultStatus,
      }) => {
        const ruleInput = random<Required<RuleInput>>();

        const { massIDDocument } = new BoldStubsBuilder()
          .createMassIDDocuments()
          .build();

        mockCheckDuplicateDocuments
          .mockResolvedValueOnce(newDuplicateDocuments)
          .mockResolvedValueOnce(oldDuplicateDocuments);

        documentLoaderService.mockResolvedValueOnce(massIDDocument);

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

  describe('WasteMassIsUniqueProcessor Errors', () => {
    it.each(wasteMassIsUniqueErrorTestCases)(
      `should return $resultStatus when $scenario`,
      async ({ massIDDocument, resultComment, resultStatus }) => {
        const ruleInput = random<Required<RuleInput>>();

        documentLoaderService.mockResolvedValueOnce(massIDDocument);

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
