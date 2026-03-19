import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { WasteMassIsUniqueProcessor } from './waste-mass-is-unique.processor';
import {
  wasteMassIsUniqueErrorTestCases,
  wasteMassIsUniqueTestCases,
} from './waste-mass-is-unique.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const mockCheckDuplicateDocuments = vi.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
vi.mock('./waste-mass-is-unique.helpers', () => ({
  ...vi.importActual('./waste-mass-is-unique.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('WasteMassIsUniqueProcessor Rule', () => {
  const ruleDataProcessor = new WasteMassIsUniqueProcessor();
  const documentLoaderService = vi.mocked(loadDocument);

  describe('WasteMassIsUniqueProcessor', () => {
    it.each(wasteMassIsUniqueTestCases)(
      `should return $resultStatus when $scenario`,
      async ({
        newDuplicateDocuments,
        oldDuplicateDocuments,
        resultComment,
        resultStatus,
      }) => {
        const ruleInput = stubRuleInput();

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
        const ruleInput = stubRuleInput();

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
