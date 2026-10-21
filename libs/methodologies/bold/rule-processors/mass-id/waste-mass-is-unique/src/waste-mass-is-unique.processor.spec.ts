import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleFindings,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { WASTE_MASS_IS_UNIQUE_FINDINGS } from './waste-mass-is-unique.findings';
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

vi.mock('./waste-mass-is-unique.helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./waste-mass-is-unique.helpers')>()),
  createAuditApiService: () => mockAuditApiService,
}));

describe('WasteMassIsUniqueProcessor Rule', () => {
  const ruleDataProcessor = new WasteMassIsUniqueProcessor();
  const documentLoaderService = vi.mocked(loadDocument);

  describe('WasteMassIsUniqueProcessor', () => {
    const processTestCase = async ({
      newDuplicateDocuments,
      oldDuplicateDocuments,
    }: (typeof wasteMassIsUniqueTestCases)[number]): Promise<{
      ruleInput: RuleInput;
      ruleOutput: RuleOutput;
    }> => {
      const ruleInput = stubRuleInput();

      const { massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments()
        .build();

      mockCheckDuplicateDocuments
        .mockResolvedValueOnce(newDuplicateDocuments)
        .mockResolvedValueOnce(oldDuplicateDocuments);

      documentLoaderService.mockResolvedValueOnce(massIDDocument);

      return {
        ruleInput,
        ruleOutput: await ruleDataProcessor.process(ruleInput),
      };
    };

    it.each(wasteMassIsUniqueTestCases)(
      `should return $resultStatus when $scenario`,
      async (testCase) => {
        const { ruleInput, ruleOutput } = await processTestCase(testCase);
        const { resultComment, resultStatus } = testCase;

        const expectedRuleOutput: RuleOutput = {
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultStatus,
        };

        expect(
          expectRuleFindings(ruleOutput, WASTE_MASS_IS_UNIQUE_FINDINGS),
        ).toEqual(expectedRuleOutput);
      },
    );

    it.each(
      wasteMassIsUniqueTestCases.filter(
        ({ resultStatus }) => resultStatus === 'FAILED',
      ),
    )(
      'should report the valid duplicate finding when $scenario',
      async (testCase) => {
        const { ruleOutput } = await processTestCase(testCase);

        expect(ruleOutput.resultContent).toEqual({
          findings: [
            {
              code: 'waste-mass-is-unique.FAILED.VALID_DUPLICATE_FOUND',
              defaultOwner: 'TO_CONFIRM',
            },
          ],
        });
      },
    );
  });

  describe('WasteMassIsUniqueProcessor Errors', () => {
    it.each(wasteMassIsUniqueErrorTestCases)(
      `should return $resultStatus when $scenario`,
      async ({ findingCode, massIDDocument, resultComment, resultStatus }) => {
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

        expect(
          expectRuleFindings(ruleOutput, WASTE_MASS_IS_UNIQUE_FINDINGS),
        ).toEqual(expectedRuleOutput);
        expect(ruleOutput.resultContent).toMatchObject({
          findings: [{ code: findingCode }],
        });
      },
    );
  });
});
